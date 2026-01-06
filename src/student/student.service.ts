// src/student/student.service.ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StudentService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePic: true,
          },
        },
      },
    });

    if (!student) {
      throw new UnauthorizedException();
    }

    return {
      id: student.user.id,
      name: student.user.name,
      bio: student.bio,
      batchYear: student.batchYear,
      domains: student.domains,
      role: "STUDENT",
      isProfileComplete: this.isStudentProfileComplete(student),
    };
  }

  private isStudentProfileComplete(student: any): boolean {
    return (
        !!student.bio &&
        Array.isArray(student.domains) &&
        student.domains.length >= 2
    );
    }

  async updateProfile(userId: string, body: any) {
    return this.prisma.student.update({
      where: { userId },
      data: {
        bio: body.bio ?? undefined,
        batchYear: body.batchYear
          ? Number(body.batchYear)
          : undefined,
        domains: Array.isArray(body.domains) ? body.domains : [],
      },
    });
  }
}
