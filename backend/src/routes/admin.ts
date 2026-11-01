import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, ComplaintStatus, ComplaintUrgency } from '@prisma/client';
import { authenticateAdmin, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// All admin routes require admin authentication
router.use(authenticateAdmin);

// ─── Admin Dashboard Stats ────────────────────────────────────────────────────
router.get('/stats', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [total, pending, inProgress, resolved, rejected] = await Promise.all([
      prisma.complaint.count(),
      prisma.complaint.count({ where: { status: 'PENDING' } }),
      prisma.complaint.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.complaint.count({ where: { status: 'RESOLVED' } }),
      prisma.complaint.count({ where: { status: 'REJECTED' } }),
    ]);

    const urgencyStats = await prisma.complaint.groupBy({
      by: ['urgency'],
      _count: { urgency: true },
    });

    const categoryStats = await prisma.complaint.groupBy({
      by: ['category'],
      _count: { category: true },
      where: { category: { not: null } },
    });

    const deptStats = await prisma.complaint.groupBy({
      by: ['departmentId'],
      _count: { departmentId: true },
      where: { departmentId: { not: null } },
    });

    res.json({
      success: true,
      stats: { total, pending, inProgress, resolved, rejected, urgencyStats, categoryStats, deptStats },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// ─── Get all complaints (admin) ───────────────────────────────────────────────
router.get('/complaints', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { status, urgency, category, department, search, page = '1', limit = '20' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {};
  if (status && status !== 'ALL') where.status = status as ComplaintStatus;
  if (urgency && urgency !== 'ALL') where.urgency = urgency as ComplaintUrgency;
  if (category) where.category = { contains: category, mode: 'insensitive' };
  if (department) where.departmentId = department;
  if (search) {
    where.OR = [
      { ticketId: { contains: search, mode: 'insensitive' } },
      { originalText: { contains: search, mode: 'insensitive' } },
      { user: { fullName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  try {
    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true, mobile: true } },
          department: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.complaint.count({ where }),
    ]);

    res.json({
      success: true,
      complaints,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
  }
});

// ─── Get single complaint (admin) ─────────────────────────────────────────────
router.get('/complaints/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, fullName: true, email: true, mobile: true } },
        department: true,
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    });

    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found' });
      return;
    }

    res.json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch complaint' });
  }
});

// ─── Assign department ────────────────────────────────────────────────────────
router.patch(
  '/complaints/:id/assign',
  [
    body('departmentId').notEmpty().withMessage('Department ID is required'),
    body('assignedTo').optional().isString(),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { departmentId, assignedTo } = req.body;
    try {
      const dept = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!dept) {
        res.status(404).json({ success: false, message: 'Department not found' });
        return;
      }

      const complaint = await prisma.complaint.update({
        where: { id: req.params.id },
        data: {
          departmentId,
          assignedTo: assignedTo || null,
          status: 'IN_PROGRESS',
        },
      });

      await prisma.complaintStatusHistory.create({
        data: {
          complaintId: complaint.id,
          status: 'IN_PROGRESS',
          remarks: `Assigned to ${dept.name}${assignedTo ? ` (${assignedTo})` : ''}`,
          changedBy: req.admin!.id,
        },
      });

      // Notify citizen
      await prisma.notification.create({
        data: {
          userId: complaint.userId,
          title: 'Complaint Assigned',
          message: `Your complaint (${complaint.ticketId}) has been assigned to ${dept.name}.`,
        },
      });

      res.json({ success: true, message: 'Complaint assigned', complaint });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to assign complaint' });
    }
  }
);

// ─── Update complaint status ──────────────────────────────────────────────────
router.patch(
  '/complaints/:id/status',
  [
    body('status').isIn(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']).withMessage('Invalid status'),
    body('remarks').optional().isString(),
    body('resolution').optional().isString(),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { status, remarks, resolution } = req.body;
    try {
      const complaint = await prisma.complaint.update({
        where: { id: req.params.id },
        data: {
          status: status as ComplaintStatus,
          officialRemarks: remarks || null,
          resolution: resolution || null,
          resolvedAt: status === 'RESOLVED' ? new Date() : null,
        },
      });

      await prisma.complaintStatusHistory.create({
        data: {
          complaintId: complaint.id,
          status: status as ComplaintStatus,
          remarks: remarks || `Status updated to ${status}`,
          changedBy: req.admin!.id,
        },
      });

      // Notify citizen
      const statusMessages: Record<string, string> = {
        RESOLVED: `Your complaint (${complaint.ticketId}) has been resolved.`,
        REJECTED: `Your complaint (${complaint.ticketId}) has been rejected.`,
        IN_PROGRESS: `Your complaint (${complaint.ticketId}) is now being processed.`,
        PENDING: `Your complaint (${complaint.ticketId}) status has been updated.`,
      };

      await prisma.notification.create({
        data: {
          userId: complaint.userId,
          title: `Complaint ${status.replace('_', ' ')}`,
          message: statusMessages[status] || '',
        },
      });

      res.json({ success: true, message: 'Status updated', complaint });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to update status' });
    }
  }
);

// ─── Update AI prediction (admin correction) ──────────────────────────────────
router.patch('/complaints/:id/ai-correction', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { category, departmentId, urgency } = req.body;
  try {
    const complaint = await prisma.complaint.update({
      where: { id: req.params.id },
      data: {
        category: category || undefined,
        departmentId: departmentId || undefined,
        urgency: (urgency as ComplaintUrgency) || undefined,
      },
    });
    res.json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update AI prediction' });
  }
});

// ─── Get all citizens ─────────────────────────────────────────────────────────
router.get('/citizens', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { search, page = '1', limit = '20' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { mobile: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          mobile: true,
          preferredLang: true,
          isActive: true,
          createdAt: true,
          _count: { select: { complaints: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      users,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch citizens' });
  }
});

// ─── Toggle citizen active status ─────────────────────────────────────────────
router.patch('/citizens/:id/toggle', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !user.isActive },
    });
    res.json({ success: true, user: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

export default router;
