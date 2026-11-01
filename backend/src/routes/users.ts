import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateCitizen, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ─── Get my notifications ─────────────────────────────────────────────────────
router.get('/notifications', authenticateCitizen, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// ─── Mark notification as read ────────────────────────────────────────────────
router.patch('/notifications/:id/read', authenticateCitizen, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Verify ownership
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

// ─── Mark all notifications as read ──────────────────────────────────────────
router.patch('/notifications/read-all', authenticateCitizen, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
});

export default router;
