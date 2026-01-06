
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DEBUG USER COUNTS ---');

    const totalUsers = await prisma.user.count();
    console.log(`Total Users in DB: ${totalUsers}`);

    const students = await prisma.user.count({
        where: { role: 'STUDENT' },
    });
    console.log(`Users with role 'STUDENT': ${students}`);

    const alumni = await prisma.user.count({
        where: { role: 'ALUMNI' },
    });
    console.log(`Users with role 'ALUMNI': ${alumni}`);

    // Check for any weirdness by grouping
    const grouped = await prisma.user.groupBy({
        by: ['role'],
        _count: {
            role: true,
        },
    });
    console.log('Grouped by Role:', grouped);

    // Sample users
    const samples = await prisma.user.findMany({ take: 3 });
    console.log('Sample Users:', samples.map(u => ({ id: u.id, email: u.email, role: u.role })));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
