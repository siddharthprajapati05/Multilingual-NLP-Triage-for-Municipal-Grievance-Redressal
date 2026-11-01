import { PrismaClient } from '@prisma/client';
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

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: {},
      create: dept,
    });
  }

  console.log('Departments seeded.');

  // Create a sample citizen user
  const passwordHash = await bcrypt.hash('citizen123', 12);
  await prisma.user.upsert({
    where: { email: 'citizen@example.com' },
    update: {},
    create: {
      email: 'citizen@example.com',
      mobile: '9876543210',
      fullName: 'Rajesh Kumar',
      passwordHash,
      preferredLang: 'en',
    },
  });

  console.log('Sample citizen created: email=citizen@example.com, password=citizen123');
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
