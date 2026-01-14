import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface UserPasswordReset {
  username: string;
  newPassword: string;
  email?: string;
}

async function resetUserPasswords() {
  const usersToReset: UserPasswordReset[] = [
    { username: 'Hello', newPassword: 'gameapp2025' },
    { username: 'Tobi', newPassword: 'gameapp2025' },
    { username: 'Dorcas', newPassword: '09121078592' },
  ];

  console.log('🔐 Starting password reset process...\n');

  for (const userData of usersToReset) {
    try {
      // Find user by username or email
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: userData.username },
            ...(userData.email ? [{ email: userData.email }] : []),
          ],
        },
      });

      if (!user) {
        console.log(`❌ User "${userData.username}" not found`);
        continue;
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(userData.newPassword, 10);

      // Update the password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      console.log(`✅ Password reset successful for:`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   New Password: ${userData.newPassword}\n`);
    } catch (error) {
      console.error(`❌ Error resetting password for "${userData.username}":`, error);
    }
  }

  // Also check emails if provided
  const emailsToCheck = [
    'ajacinta560@gmail.com',
    'aebubengozichukwu@gmail.com',
  ];

  console.log('\n📧 Checking emails...\n');
  for (const email of emailsToCheck) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        console.log(`✅ Found user with email ${email}:`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Current password hash exists: ${user.password ? 'Yes' : 'No'}\n`);
      } else {
        console.log(`❌ No user found with email: ${email}\n`);
      }
    } catch (error) {
      console.error(`❌ Error checking email "${email}":`, error);
    }
  }

  await prisma.$disconnect();
}

resetUserPasswords()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

