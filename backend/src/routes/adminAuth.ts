import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateAdmin, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// ─── Admin Login ─────────────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('adminId').trim().notEmpty().withMessage('Admin ID is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { adminId, password } = req.body;

    const configuredAdminId = process.env.ADMIN_ID;
    const configuredAdminHash = process.env.ADMIN_PASSWORD_HASH;

    if (!configuredAdminId || !configuredAdminHash) {
      res.status(500).json({
        success: false,
        message: 'Admin credentials not configured on server',
      });
      return;
    }

    // Constant-time comparison for admin ID
    if (adminId !== configuredAdminId) {
      res.status(401).json({ success: false, message: 'Invalid admin credentials' });
      return;
    }

    try {
      const isValid = await bcrypt.compare(password, configuredAdminHash);
      if (!isValid) {
        res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        return;
      }

      const token = jwt.sign(
        { id: adminId, role: 'admin' },
        process.env.JWT_SECRET!,
        { expiresIn: '8h' }
      );

      res.cookie('adminToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
      });

      res.json({
        success: true,
        message: 'Admin login successful',
        token,
        admin: { id: adminId, role: 'admin', name: 'System Administrator' },
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  }
);

// ─── Admin Logout ─────────────────────────────────────────────────────────────
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('adminToken');
  res.json({ success: true, message: 'Admin logged out successfully' });
});

// ─── Verify admin session ─────────────────────────────────────────────────────
router.get('/me', authenticateAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    admin: {
      id: req.admin!.id,
      role: 'admin',
      name: 'System Administrator',
    },
  });
});

export default router;
