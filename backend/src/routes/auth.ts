import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authenticateCitizen, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ─── Register ────────────────────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('email').optional().isEmail().withMessage('Invalid email address'),
    body('mobile')
      .optional()
      .isMobilePhone('any')
      .withMessage('Invalid mobile number'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { fullName, email, mobile, password, preferredLang } = req.body;

    if (!email && !mobile) {
      res.status(400).json({
        success: false,
        message: 'Either email or mobile number is required',
      });
      return;
    }

    try {
      // Check duplicates
      if (email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          res.status(409).json({ success: false, message: 'Email already registered' });
          return;
        }
      }
      if (mobile) {
        const existing = await prisma.user.findUnique({ where: { mobile } });
        if (existing) {
          res.status(409).json({ success: false, message: 'Mobile number already registered' });
          return;
        }
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          fullName,
          email: email || null,
          mobile: mobile || null,
          passwordHash,
          preferredLang: preferredLang || 'en',
        },
        select: { id: true, fullName: true, email: true, mobile: true, preferredLang: true },
      });

      const token = jwt.sign(
        { id: user.id, role: 'citizen' },
        process.env.JWT_SECRET!,
        { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string & jwt.SignOptions['expiresIn'] }
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({ success: true, message: 'Registration successful', user, token });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ success: false, message: 'Registration failed' });
    }
  }
);

// ─── Login ───────────────────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('identifier').trim().notEmpty().withMessage('Email or mobile is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { identifier, password } = req.body;

    try {
      // Find user by email or mobile
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: identifier }, { mobile: identifier }],
        },
      });

      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({ success: false, message: 'Account is deactivated' });
        return;
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      const token = jwt.sign(
        { id: user.id, role: 'citizen' },
        process.env.JWT_SECRET!,
        { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string & jwt.SignOptions['expiresIn'] }
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          mobile: user.mobile,
          preferredLang: user.preferredLang,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  }
);

// ─── Logout ──────────────────────────────────────────────────────────────────
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// ─── Get current user profile ────────────────────────────────────────────────
router.get('/me', authenticateCitizen, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        preferredLang: true,
        createdAt: true,
      },
    });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

// ─── Update profile ──────────────────────────────────────────────────────────
router.put('/profile', authenticateCitizen, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { fullName, preferredLang } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { fullName, preferredLang },
      select: { id: true, fullName: true, email: true, mobile: true, preferredLang: true },
    });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Profile update failed' });
  }
});

export default router;
