require('dotenv').config();

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const permissions = [
  { key: 'create_user', description: 'Create new users' },
  { key: 'view_user', description: 'View user list' },
  { key: 'assign_role', description: 'Assign roles to users' },
  { key: 'add_expense', description: 'Create expenses' },
  { key: 'view_expense', description: 'View expenses' },
  { key: 'clear_expenses', description: 'Clear all expenses' },
  { key: 'view_reports', description: 'View weekly and monthly reports' },
  { key: 'view_food_timetable', description: 'View the weekly food timetable' },
];

const roles = [
  { name: 'Admin', description: 'Full access to the flat management app' },
  { name: 'Member', description: 'Can add expenses and view shared reports' },
];

const categories = [
  { name: 'Food', icon: 'restaurant', color: '#E16A3D', sortOrder: 1 },
  { name: 'Rent', icon: 'home', color: '#D64550', sortOrder: 2 },
  { name: 'Bills', icon: 'flash', color: '#F0B100', sortOrder: 3 },
  { name: 'Transport', icon: 'car', color: '#2C7A7B', sortOrder: 4 },
  { name: 'Cleaning', icon: 'sparkles', color: '#4A67FF', sortOrder: 5 },
  { name: 'Internet', icon: 'wifi', color: '#7C59D8', sortOrder: 6 },
];

const foodTimetableDays = [
  { dayOfWeek: 5, breakfast: '8:00 AM', lunch: '1:30 PM', dinner: '8:30 PM', note: 'Friday can be the special shared meal.' },
  { dayOfWeek: 6, breakfast: '9:00 AM', lunch: '2:00 PM', dinner: '9:00 PM', note: 'Weekend timing can stay flexible.' },
  { dayOfWeek: 7, breakfast: '9:00 AM', lunch: '2:00 PM', dinner: '8:30 PM', note: 'A relaxed Sunday lunch keeps the day easy.' },
  { dayOfWeek: 1, breakfast: '7:30 AM', lunch: '1:00 PM', dinner: '8:00 PM', note: 'Fresh start meal plan.' },
  { dayOfWeek: 2, breakfast: '7:30 AM', lunch: '1:00 PM', dinner: '8:00 PM', note: 'Keep lunch light and quick.' },
  { dayOfWeek: 3, breakfast: '7:45 AM', lunch: '1:15 PM', dinner: '8:15 PM', note: 'Soup or salad works well for a lighter day.' },
  { dayOfWeek: 4, breakfast: '7:30 AM', lunch: '1:00 PM', dinner: '8:00 PM', note: 'Use Thursday to plan the next week.' },
];

async function resetDatabase() {
  await prisma.$transaction([
    prisma.rolePermission.deleteMany(),
    prisma.userRole.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.budget.deleteMany(),
    prisma.foodTimetableDay.deleteMany(),
    prisma.category.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.role.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function seedPermissions() {
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission,
    });
  }
}

async function seedRoles() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Admin' } });
  const memberRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Member' } });
  const permissionRows = await prisma.permission.findMany();

  await prisma.rolePermission.deleteMany();

  for (const permission of permissionRows) {
    await prisma.rolePermission.create({
      data: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  for (const permissionKey of ['add_expense', 'view_expense', 'view_reports', 'view_food_timetable']) {
    const permission = permissionRows.find((item) => item.key === permissionKey);
    if (!permission) {
      continue;
    }

    await prisma.rolePermission.create({
      data: {
        roleId: memberRole.id,
        permissionId: permission.id,
      },
    });
  }
}

async function seedCategories() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: category,
      create: category,
    });
  }
}

async function seedAdmin() {
  const roleRows = await prisma.role.findMany({
    orderBy: {
      name: 'asc',
    },
  });
  const fullName = process.env.ADMIN_FULL_NAME || 'AhmadZiaSeyar';
  const username = process.env.ADMIN_USERNAME || 'AhmadZiaSeyar';
  const phone = process.env.ADMIN_PHONE || '+10000000000';
  const email = (process.env.ADMIN_EMAIL || 'ahmadziaseyar@flatwallet.app').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';

  const passwordHash = await bcrypt.hash(password, 10);

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email },
        { username: 'admin' },
        { email: 'admin@flatwallet.app' },
      ],
    },
  });

  const admin = existingAdmin
    ? await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          fullName,
          username,
          phone,
          email,
          passwordHash,
          isActive: true,
        },
      })
    : await prisma.user.create({
        data: {
          fullName,
          username,
          phone,
          email,
          passwordHash,
          isActive: true,
        },
      });

  await prisma.userRole.deleteMany({
    where: {
      userId: admin.id,
    },
  });

  await prisma.userRole.createMany({
    data: roleRows.map((role) => ({
      userId: admin.id,
      roleId: role.id,
    })),
    skipDuplicates: true,
  });

  return admin;
}

async function seedFoodTimetable(adminUserId) {
  await prisma.foodTimetableDay.deleteMany();

  await prisma.foodTimetableDay.createMany({
    data: foodTimetableDays.map((day) => ({
      ...day,
      updatedById: adminUserId,
    })),
  });
}

async function main() {
  await resetDatabase();
  await seedPermissions();
  await seedRoles();
  await seedCategories();
  const admin = await seedAdmin();
  await seedFoodTimetable(admin.id);
  // Finish with an empty expense table so a fresh seed always starts from zero expenses.
  await prisma.expense.deleteMany();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
