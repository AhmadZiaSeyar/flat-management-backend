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
  { key: 'view_reports', description: 'View weekly and monthly reports' },
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

  for (const permissionKey of ['add_expense', 'view_expense', 'view_reports']) {
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
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Admin' } });
  const username = process.env.ADMIN_USERNAME || 'admin';
  const phone = process.env.ADMIN_PHONE || '+10000000000';
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  const pin = process.env.ADMIN_PIN || '1234';

  const passwordHash = await bcrypt.hash(password, 10);
  const pinHash = await bcrypt.hash(pin, 10);

  const admin = await prisma.user.upsert({
    where: { username },
    update: {
      fullName: process.env.ADMIN_FULL_NAME || 'Main Admin',
      phone,
      passwordHash,
      pinHash,
      isActive: true,
    },
    create: {
      fullName: process.env.ADMIN_FULL_NAME || 'Main Admin',
      username,
      phone,
      passwordHash,
      pinHash,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id,
    },
  });
}

async function main() {
  await seedPermissions();
  await seedRoles();
  await seedCategories();
  await seedAdmin();
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
