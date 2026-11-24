import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient, ComplaintStatus, ComplaintUrgency } from '@prisma/client';
import { authenticateCitizen, AuthenticatedRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { generateTicketId, callAIService } from '../utils/helpers';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

// ─── Submit a complaint ───────────────────────────────────────────────────────
router.post(
  '/',
  authenticateCitizen,
  upload.single('photo'),
  [
    body('text').trim().notEmpty().withMessage('Complaint text is required'),
    body('language').optional().isString(),
    body('locality').optional().isString(),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { text, language, locality, address } = req.body;
    const photoUrl = req.file
      ? `/uploads/${req.file.filename}`
      : undefined;

    try {
      const ticketId = await generateTicketId(prisma);

      // Try AI service (non-blocking – won't break submission if unavailable)
      let aiResult: {
        category?: string;
        department?: string;
        urgency?: string;
        confidence?: number;
        translatedText?: string;
        detectedLanguage?: string;
        estimatedResolutionDays?: number;
        modelVersion?: string;
      } = {};
      try {
        aiResult = await callAIService(text, language || 'en');
        console.log('AI service result:', aiResult);
      } catch (err: any) {
        console.warn('AI service call failed (continuing without AI):', err?.message || err);
      }

      // Auto-assign to matching Department if predicted by AI
      let departmentId: string | null = null;
      if (aiResult.department) {
        const matchedDept = await prisma.department.findFirst({
          where: {
            OR: [
              { name: { equals: aiResult.department, mode: 'insensitive' } },
              { name: { contains: aiResult.category || '', mode: 'insensitive' } },
            ],
          },
        });
        if (matchedDept) {
          departmentId = matchedDept.id;
        }
      }

      const complaint = await prisma.complaint.create({
        data: {
          ticketId,
          userId: req.user!.id,
          originalText: text,
          language: language || 'en',
          locality: locality || null,
          address: address || null,
          photoUrl: photoUrl || null,
          departmentId,
          aiCategory: aiResult.category || null,
          aiDepartment: aiResult.department || null,
          aiUrgency: aiResult.urgency || null,
          aiConfidence: aiResult.confidence || null,
          aiProcessed: !!aiResult.category,
          translatedText: aiResult.translatedText || (language === 'en' ? text : null),
          estimatedDays: aiResult.estimatedResolutionDays || null,
          detectedLang: aiResult.detectedLanguage || null,
          status: ComplaintStatus.PENDING,
          urgency: (aiResult.urgency as ComplaintUrgency) || ComplaintUrgency.MEDIUM,
          category: aiResult.category || null,
        },
      });

      // Create initial status history entry
      await prisma.complaintStatusHistory.create({
        data: {
          complaintId: complaint.id,
          status: ComplaintStatus.PENDING,
          remarks: departmentId && aiResult.department
            ? `Complaint submitted and auto-assigned to ${aiResult.department} by AI`
            : 'Complaint submitted successfully',
          changedBy: 'system',
        },
      });

      // Notify user
      await prisma.notification.create({
        data: {
          userId: req.user!.id,
          title: 'Complaint Submitted',
          message: `Your complaint (${ticketId}) has been submitted successfully.`,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Complaint submitted successfully',
        ticketId,
        complaint: {
          id: complaint.id,
          ticketId: complaint.ticketId,
          status: complaint.status,
          aiProcessed: complaint.aiProcessed,
          aiCategory: complaint.aiCategory,
          aiDepartment: complaint.aiDepartment,
          aiUrgency: complaint.aiUrgency,
          aiConfidence: complaint.aiConfidence,
          translatedText: complaint.translatedText,
          estimatedDays: complaint.estimatedDays,
          detectedLang: complaint.detectedLang,
        },
      });
    } catch (error) {
      console.error('Complaint submission error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit complaint' });
    }
  }
);

// ─── Get my complaints ────────────────────────────────────────────────────────
router.get('/my', authenticateCitizen, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { status, search, page = '1', limit = '10' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = { userId: req.user!.id };
  if (status && status !== 'ALL') {
    where.status = status as ComplaintStatus;
  }
  if (search) {
    where.OR = [
      { ticketId: { contains: search, mode: 'insensitive' } },
      { originalText: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ticketId: true,
          originalText: true,
          category: true,
          urgency: true,
          status: true,
          createdAt: true,
          department: { select: { name: true } },
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

// ─── Track by ticket ID (public) ─────────────────────────────────────────────
router.get('/track/:ticketId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { ticketId } = req.params;
  try {
    const complaint = await prisma.complaint.findUnique({
      where: { ticketId },
      select: {
        id: true,
        ticketId: true,
        originalText: true,
        language: true,
        translatedText: true,
        estimatedDays: true,
        category: true,
        urgency: true,
        status: true,
        locality: true,
        aiCategory: true,
        aiDepartment: true,
        aiUrgency: true,
        aiConfidence: true,
        aiProcessed: true,
        photoUrl: true,
        department: { select: { name: true } },
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        statusHistory: {
          orderBy: { changedAt: 'asc' },
          select: { status: true, remarks: true, changedAt: true },
        },
      },
    });

    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found' });
      return;
    }

    res.json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to track complaint' });
  }
});

// ─── Get complaint details (citizen - own only) ───────────────────────────────
router.get('/:id', authenticateCitizen, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const complaint = await prisma.complaint.findFirst({
      where: { id, userId: req.user!.id },
      include: {
        department: { select: { name: true, code: true } },
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

// ─── Citizen dashboard stats ─────────────────────────────────────────────────
router.get('/stats/me', authenticateCitizen, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const [total, pending, inProgress, resolved] = await Promise.all([
      prisma.complaint.count({ where: { userId } }),
      prisma.complaint.count({ where: { userId, status: 'PENDING' } }),
      prisma.complaint.count({ where: { userId, status: 'IN_PROGRESS' } }),
      prisma.complaint.count({ where: { userId, status: 'RESOLVED' } }),
    ]);
    res.json({ success: true, stats: { total, pending, inProgress, resolved } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

export default router;
