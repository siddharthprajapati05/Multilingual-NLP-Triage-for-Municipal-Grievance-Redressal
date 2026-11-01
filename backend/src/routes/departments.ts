import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ─── Get all departments (public) ────────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, departments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch departments' });
  }
});

// ─── Create department (admin only) ──────────────────────────────────────────
router.post(
  '/',
  authenticateAdmin,
  [
    body('name').trim().notEmpty().withMessage('Department name is required'),
    body('code').trim().notEmpty().withMessage('Department code is required'),
    body('description').optional().isString(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { name, code, description } = req.body;
    try {
      const dept = await prisma.department.create({
        data: { name, code: code.toUpperCase(), description },
      });
      res.status(201).json({ success: true, department: dept });
    } catch (error: any) {
      if (error.code === 'P2002') {
        res.status(409).json({ success: false, message: 'Department name or code already exists' });
      } else {
        res.status(500).json({ success: false, message: 'Failed to create department' });
      }
    }
  }
);

// ─── Update department (admin only) ──────────────────────────────────────────
router.put('/:id', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  const { name, description, isActive } = req.body;
  try {
    const dept = await prisma.department.update({
      where: { id: req.params.id },
      data: { name, description, isActive },
    });
    res.json({ success: true, department: dept });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update department' });
  }
});

export default router;
