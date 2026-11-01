import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// All analytics routes require admin auth
router.use(authenticateAdmin);

// ─── Complaint trend (monthly) ───────────────────────────────────────────────
router.get('/trends', async (req: Request, res: Response): Promise<void> => {
  try {
    // Get complaints grouped by month for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const complaints = await prisma.complaint.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by month
    const monthlyData: Record<string, { total: number; resolved: number }> = {};
    complaints.forEach(c => {
      const key = c.createdAt.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyData[key]) monthlyData[key] = { total: 0, resolved: 0 };
      monthlyData[key].total++;
      if (c.status === 'RESOLVED') monthlyData[key].resolved++;
    });

    res.json({ success: true, trends: monthlyData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch trends' });
  }
});

// ─── Category breakdown ───────────────────────────────────────────────────────
router.get('/categories', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await prisma.complaint.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
    });
    res.json({ success: true, categories: data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch category analytics' });
  }
});

// ─── Language breakdown ───────────────────────────────────────────────────────
router.get('/languages', async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await prisma.complaint.groupBy({
      by: ['language'],
      _count: { language: true },
      orderBy: { _count: { language: 'desc' } },
    });
    res.json({ success: true, languages: data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch language analytics' });
  }
});

// ─── Department performance ───────────────────────────────────────────────────
router.get('/departments', async (req: Request, res: Response): Promise<void> => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        complaints: {
          select: { status: true, createdAt: true, resolvedAt: true },
        },
      },
    });

    const performance = departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      total: dept.complaints.length,
      resolved: dept.complaints.filter(c => c.status === 'RESOLVED').length,
      pending: dept.complaints.filter(c => c.status === 'PENDING').length,
      inProgress: dept.complaints.filter(c => c.status === 'IN_PROGRESS').length,
    }));

    res.json({ success: true, departments: performance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch department analytics' });
  }
});

export default router;
