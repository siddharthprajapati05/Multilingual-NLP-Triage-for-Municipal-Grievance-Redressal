import { PrismaClient } from '@prisma/client';
import axios from 'axios';

export const generateTicketId = async (prisma: PrismaClient): Promise<string> => {
  const prefix = 'MGR';
  let ticketId: string;
  let exists = true;

  while (exists) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    ticketId = `${prefix}${randomNum}`;
    const existing = await prisma.complaint.findUnique({ where: { ticketId } });
    exists = !!existing;
  }

  return ticketId!;
};

export const callAIService = async (
  text: string,
  language: string
): Promise<{ category?: string; department?: string; urgency?: string; confidence?: number }> => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const response = await axios.post(
    `${aiServiceUrl}/predict`,
    { text, language },
    { timeout: 5000 }
  );
  return response.data;
};
