// src/user/user.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // =========================
  // PROFILE
  // =========================
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new UnauthorizedException();
    return user;
  }

  async updateProfile(userId: string, body: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        bio: body.bio ?? undefined,
        company: body.company ?? undefined,
        position: body.position ?? undefined,
        batchYear: body.batchYear ? Number(body.batchYear) : null,
        domains: Array.isArray(body.domains) ? body.domains : [],
      },
    });
  }

  // =========================
  // PROFILE STATS
  // =========================
  async getUserStats(userId: string) {
    const [connectionsCount, pendingRequests] =
      await Promise.all([
        this.prisma.connection.count({
          where: {
            OR: [{ userId }, { friendId: userId }],
          },
        }),
        this.prisma.friendRequest.count({
          where: {
            receiverId: userId,
            status: 'PENDING',
          },
        }),
      ]);

    return { connectionsCount, pendingRequests };
  }

  // =========================
  // USER SEARCH
  // =========================
  async searchUsers(query: string, currentUserId: string) {
    if (!query || query.trim().length < 2) return [];

    const connections = await this.prisma.connection.findMany({
      where: {
        OR: [
          { userId: currentUserId },
          { friendId: currentUserId },
        ],
      },
      select: { userId: true, friendId: true },
    });

    const connectedIds = connections.map(c =>
      c.userId === currentUserId ? c.friendId : c.userId,
    );

    const pending = await this.prisma.friendRequest.findMany({
      where: {
        OR: [
          { senderId: currentUserId },
          { receiverId: currentUserId },
        ],
        status: 'PENDING',
      },
      select: { senderId: true, receiverId: true },
    });

    const pendingIds = pending.flatMap(p => [
      p.senderId,
      p.receiverId,
    ]);

    return this.prisma.user.findMany({
      where: {
        id: {
          notIn: [
            currentUserId,
            ...connectedIds,
            ...pendingIds,
          ],
        },
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        role: true,
        profilePic: true,
        company: true,
        position: true,
      },
      take: 10,
    });
  }
}


