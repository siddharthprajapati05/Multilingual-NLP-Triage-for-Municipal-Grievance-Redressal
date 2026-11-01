import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createError } from './errorHandler';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    mobile?: string;
    fullName: string;
    role: 'citizen';
  };
  admin?: {
    id: string;
    role: 'admin';
  };
}

// ─── Citizen Auth Middleware ─────────────────────────────────────────────────
export const authenticateCitizen = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Check Authorization header first, then cookie
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw createError('JWT secret not configured', 500);

    const decoded = jwt.verify(token, secret) as {
      id: string;
      role: string;
      iat: number;
      exp: number;
    };

    if (decoded.role !== 'citizen') {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, mobile: true, fullName: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'User not found or inactive' });
      return;
    }

    req.user = { id: user.id, fullName: user.fullName, email: user.email || undefined, mobile: user.mobile || undefined, role: 'citizen' };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
      return;
    }
    next(error);
  }
};

// ─── Admin Auth Middleware ───────────────────────────────────────────────────
export const authenticateAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies?.adminToken) {
      token = req.cookies.adminToken;
    }

    if (!token) {
      res.status(401).json({ success: false, message: 'Admin authentication required' });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw createError('JWT secret not configured', 500);

    const decoded = jwt.verify(token, secret) as {
      id: string;
      role: string;
    };

    if (decoded.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    req.admin = { id: decoded.id, role: 'admin' };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, message: 'Invalid or expired admin token' });
      return;
    }
    next(error);
  }
};
