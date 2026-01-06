
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DEBUG USER vs STUDENT COUNTS ---');

    const userStudents = await prisma.user.count({
        where: { role: 'STUDENT' },
    });
    console.log(`Users with role 'STUDENT' (User table): ${userStudents}`);

    const studentTableCount = await prisma.student.count();
    console.log(`Records in 'Student' table: ${studentTableCount}`);

    const userAlumni = await prisma.user.count({
        where: { role: 'ALUMNI' },
    });
    console.log(`Users with role 'ALUMNI' (User table): ${userAlumni}`);

    // Check simple analytics IDs if possible (though this is backend)
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
