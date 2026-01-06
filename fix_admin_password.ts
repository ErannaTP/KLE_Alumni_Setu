import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'etpatil62@gmail.com';
    const newPassword = 'password';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log(`Checking for admin user: ${email}...`);

    const admin = await prisma.admin.findUnique({ where: { email } });

    if (admin) {
        console.log(`✅ Admin found. Updating password to '${newPassword}'...`);
        await prisma.admin.update({
            where: { email },
            data: { password: hashedPassword },
        });
        console.log('✅ Password updated successfully.');
    } else {
        console.log(`❌ Admin NOT found. Creating new admin with password '${newPassword}'...`);
        await prisma.admin.create({
            data: {
                email,
                password: hashedPassword,
                name: 'Admin User',
            },
        });
        console.log('✅ Admin user created successfully.');
    }
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
