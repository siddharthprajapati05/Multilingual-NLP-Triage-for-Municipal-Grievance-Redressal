import { PrismaClient, ComplaintStatus, ComplaintUrgency } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create departments
  const departments = [
    { name: 'Sanitation Department', code: 'SANITATION', description: 'Handles garbage collection, cleanliness, and waste management' },
    { name: 'Water Supply Department', code: 'WATER', description: 'Handles water supply, pipeline, and drainage issues' },
    { name: 'Street Lighting Department', code: 'LIGHTING', description: 'Handles street lights and electrical infrastructure' },
    { name: 'Roads & Infrastructure', code: 'ROADS', description: 'Handles road maintenance, potholes, and infrastructure' },
    { name: 'Parks & Recreation', code: 'PARKS', description: 'Handles public parks and recreational areas' },
    { name: 'Electrical Department', code: 'ELECTRICAL', description: 'Handles electrical issues and power supply' },
    { name: 'Health Department', code: 'HEALTH', description: 'Handles public health and sanitation issues' },
    { name: 'General Administration', code: 'ADMIN', description: 'General administrative complaints' },
  ];

  const deptMap: Record<string, string> = {};
  for (const dept of departments) {
    const d = await prisma.department.upsert({
      where: { code: dept.code },
      update: {},
      create: dept,
    });
    deptMap[dept.code] = d.id;
  }
  console.log('Departments seeded.');

  // Create sample citizen user
  const passwordHash = await bcrypt.hash('citizen123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'citizen@example.com' },
    update: {},
    create: {
      email: 'citizen@example.com',
      mobile: '9876543210',
      fullName: 'Rajesh Kumar',
      passwordHash,
      preferredLang: 'hi',
    },
  });
  console.log('Sample citizen created: email=citizen@example.com');

  // Seed sample complaints for demo
  const sampleComplaints = [
    {
      ticketId: 'GR-2026-0001',
      userId: user.id,
      departmentId: deptMap['SANITATION'],
      originalText: 'कचरा तीन दिनों से नहीं उठाया गया है और बदबू आ रही है',
      language: 'hi',
      detectedLang: 'hi',
      translatedText: 'Garbage has not been collected for three days and it is smelling foul',
      category: 'Sanitation',
      aiCategory: 'Sanitation',
      aiDepartment: 'Sanitation Department',
      urgency: ComplaintUrgency.MEDIUM,
      aiUrgency: 'MEDIUM',
      aiConfidence: 0.94,
      aiProcessed: true,
      estimatedDays: 5,
      status: ComplaintStatus.PENDING,
      locality: 'Ward 12, Indiranagar',
      address: 'Near Community Park, 4th Cross',
    },
    {
      ticketId: 'GR-2026-0002',
      userId: user.id,
      departmentId: deptMap['LIGHTING'],
      originalText: 'எங்கள் தெருவில் மின் விளக்குகள் எரியவில்லை, இரவில் மிகவும் இருட்டாக உள்ளது',
      language: 'ta',
      detectedLang: 'ta',
      translatedText: 'Street lights in our street are not working, it is very dark at night',
      category: 'Street Lighting',
      aiCategory: 'Street Lighting',
      aiDepartment: 'Street Lighting Department',
      urgency: ComplaintUrgency.LOW,
      aiUrgency: 'LOW',
      aiConfidence: 0.91,
      aiProcessed: true,
      estimatedDays: 14,
      status: ComplaintStatus.IN_PROGRESS,
      locality: 'Ward 8, Gandhi Nagar',
      address: 'Main Bazaar Road, Pole #45',
      assignedTo: 'Inspector R. Selvam',
      officialRemarks: 'Technician dispatched for bulb replacement.',
    },
    {
      ticketId: 'GR-2026-0003',
      userId: user.id,
      departmentId: deptMap['ROADS'],
      originalText: 'প্রধান রাস্তায় বড় গর্তের কারণে दुर्घटना ঘটছে, অবিলম্বে মেরামত প্রয়োজন',
      language: 'bn',
      detectedLang: 'bn',
      translatedText: 'Accidents are happening due to a big pothole on the main road, immediate repair is needed',
      category: 'Roads & Maintenance',
      aiCategory: 'Roads & Maintenance',
      aiDepartment: 'Roads & Infrastructure',
      urgency: ComplaintUrgency.HIGH,
      aiUrgency: 'HIGH',
      aiConfidence: 0.97,
      aiProcessed: true,
      estimatedDays: 3,
      status: ComplaintStatus.PENDING,
      locality: 'Sector 4, Ring Road',
      address: 'Opposite Metro Pillar 142',
    },
    {
      ticketId: 'GR-2026-0004',
      userId: user.id,
      departmentId: deptMap['WATER'],
      originalText: 'ಕಳೆದ ಮೂರು ದಿನಗಳಿಂದ ನಮ್ಮ ಬಡಾವಣೆಯಲ್ಲಿ ಕುಡಿಯುವ ನೀರು ಸರಬರಾಜು ಆಗುತ್ತಿಲ್ಲ',
      language: 'kn',
      detectedLang: 'kn',
      translatedText: 'Drinking water is not being supplied in our locality for the past three days',
      category: 'Water Supply',
      aiCategory: 'Water Supply',
      aiDepartment: 'Water Supply Department',
      urgency: ComplaintUrgency.HIGH,
      aiUrgency: 'HIGH',
      aiConfidence: 0.95,
      aiProcessed: true,
      estimatedDays: 2,
      status: ComplaintStatus.IN_PROGRESS,
      locality: 'Ward 15, Malleshwaram',
      address: '7th Cross, Block B',
      assignedTo: 'Engineer K. Suresh',
      officialRemarks: 'Main pipeline valve undergoing emergency repair.',
    },
    {
      ticketId: 'GR-2026-0005',
      userId: user.id,
      departmentId: deptMap['PARKS'],
      originalText: 'Children park playground swing is broken and dangerous for kids',
      language: 'en',
      detectedLang: 'en',
      translatedText: 'Children park playground swing is broken and dangerous for kids',
      category: 'Parks & Recreation',
      aiCategory: 'Parks & Recreation',
      aiDepartment: 'Parks & Recreation',
      urgency: ComplaintUrgency.LOW,
      aiUrgency: 'LOW',
      aiConfidence: 0.89,
      aiProcessed: true,
      estimatedDays: 7,
      status: ComplaintStatus.RESOLVED,
      locality: 'Green Park, Block C',
      address: 'Sector 2 Playground',
      assignedTo: 'Supervisor Amit Sharma',
      officialRemarks: 'Swing repaired and tested for child safety.',
      resolution: 'Swing chain replaced and bench welded.',
      resolvedAt: new Date(),
    },
  ];

  for (const complaint of sampleComplaints) {
    await prisma.complaint.upsert({
      where: { ticketId: complaint.ticketId },
      update: {},
      create: complaint,
    });
  }
  console.log(`Seeded ${sampleComplaints.length} sample multilingual complaints.`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
