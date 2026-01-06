import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function checkAdmin() {
    const email = 'etpatil62@gmail.com';
    const password = 'password';

    const admin = await prisma.admin.findUnique({ where: { email } });

    if (!admin) {
        console.log('❌ Admin user NOT found in database.');
    } else {
        console.log('✅ Admin user FOUND:', admin);
        const isMatch = await bcrypt.compare(password, admin.password);
        console.log('🔑 Password match check:', isMatch ? '✅ MATCH' : '❌ FAIL');
    }
}

checkAdmin()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
