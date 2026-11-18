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

// ─── Update AI prediction (admin correction / manual override) ────────────────
const SLA_LOOKUP: Record<string, number> = {
  'Sanitation_HIGH': 2, 'Sanitation_MEDIUM': 5, 'Sanitation_LOW': 10,
  'Water Supply_HIGH': 1, 'Water Supply_MEDIUM': 4, 'Water Supply_LOW': 8,
  'Street Lighting_HIGH': 3, 'Street Lighting_MEDIUM': 7, 'Street Lighting_LOW': 14,
  'Roads & Infrastructure_HIGH': 3, 'Roads & Infrastructure_MEDIUM': 7, 'Roads & Infrastructure_LOW': 15,
  'Roads & Maintenance_HIGH': 3, 'Roads & Maintenance_MEDIUM': 7, 'Roads & Maintenance_LOW': 15,
  'Parks & Recreation_HIGH': 5, 'Parks & Recreation_MEDIUM': 10, 'Parks & Recreation_LOW': 15,
  'Electrical Department_HIGH': 1, 'Electrical Department_MEDIUM': 3, 'Electrical Department_LOW': 7,
  'Electrical_HIGH': 1, 'Electrical_MEDIUM': 3, 'Electrical_LOW': 7,
  'Health Department_HIGH': 1, 'Health Department_MEDIUM': 3, 'Health Department_LOW': 7,
  'Health_HIGH': 1, 'Health_MEDIUM': 3, 'Health_LOW': 7,
  'General Administration_HIGH': 3, 'General Administration_MEDIUM': 7, 'General Administration_LOW': 14,
  'General_HIGH': 3, 'General_MEDIUM': 7, 'General_LOW': 14,
};

router.patch('/complaints/:id/ai-correction', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { category, departmentId, urgency, estimatedDays, reason } = req.body;
  try {
    const existing = await prisma.complaint.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Complaint not found' });
      return;
    }

    const finalCategory = category || existing.category || existing.aiCategory || 'General';
    const finalUrgency = (urgency as ComplaintUrgency) || existing.urgency;
    const lookupKey = `${finalCategory}_${finalUrgency}`;
    const autoEstimatedDays = SLA_LOOKUP[lookupKey] || 7;

    const parsedCustomDays = estimatedDays !== undefined && estimatedDays !== null && estimatedDays !== ''
      ? parseInt(String(estimatedDays), 10)
      : null;
    const newEstimatedDays = (parsedCustomDays && !isNaN(parsedCustomDays) && parsedCustomDays > 0)
      ? parsedCustomDays
      : autoEstimatedDays;

    // Auto-resolve departmentId if category changed and no explicit departmentId given
    let finalDepartmentId = departmentId || existing.departmentId;
    if (!departmentId && category && category !== existing.category) {
      const matchedDept = await prisma.department.findFirst({
        where: {
          OR: [
            { name: { contains: category, mode: 'insensitive' } },
            { code: { contains: category.slice(0, 4).toUpperCase() } },
          ],
        },
      });
      if (matchedDept) finalDepartmentId = matchedDept.id;
    }

    const complaint = await prisma.complaint.update({
      where: { id: req.params.id },
      data: {
        category: category || undefined,
        departmentId: finalDepartmentId || undefined,
        urgency: finalUrgency,
        estimatedDays: newEstimatedDays,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, fullName: true, email: true, mobile: true } },
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    });

    // Record audit entry in status history
    await prisma.complaintStatusHistory.create({
      data: {
        complaintId: complaint.id,
        status: complaint.status,
        remarks: reason
          ? `Manual Admin Override: Category → ${finalCategory}, Urgency → ${finalUrgency}, Resolution → ${newEstimatedDays} days (${reason})`
          : `Manual Admin Override: Category → ${finalCategory}, Urgency → ${finalUrgency}, Resolution → ${newEstimatedDays} days`,
        changedBy: req.admin?.id || 'admin',
      },
    });

    res.json({ success: true, message: 'Complaint category, urgency, and resolution days updated successfully', complaint });
  } catch (error) {
    console.error('AI correction error:', error);
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
