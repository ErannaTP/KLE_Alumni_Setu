// src/connections/connections.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConnectionsService {
  constructor(private prisma: PrismaService) {}

  async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot connect with yourself');
    }

    return this.prisma.friendRequest.create({
      data: { senderId, receiverId },
    });
  }

  async getPendingRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: { id: true, name: true, profilePic: true, role: true },
        },
      },
    });
  }

  async acceptRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.receiverId !== userId) {
      throw new BadRequestException('Invalid request');
    }

    await this.prisma.$transaction([
        this.prisma.friendRequest.update({
            where: { id: requestId },
            data: { status: 'ACCEPTED' },
        }),

        this.prisma.connection.createMany({
            data: [
            { userId: request.senderId, friendId: request.receiverId },
            { userId: request.receiverId, friendId: request.senderId },
            ],
        }),

        this.prisma.conversation.create({
            data: {
            userAId: request.senderId,
            userBId: request.receiverId,
            },
        }),
        ]);

    return { success: true };
  }

  async declineRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.receiverId !== userId) {
      throw new BadRequestException('Invalid request');
    }

    await this.prisma.friendRequest.delete({
      where: { id: requestId },
    });

    return { success: true };
  }

  async getConnections(userId: string) {
    return this.prisma.connection.findMany({
      where: { userId },
      include: {
        friend: {
          select: { id: true, name: true, profilePic: true, role: true },
        },
      },
    });
  }

  async getStats(userId: string) {
    const [connections, pending] = await Promise.all([
      this.prisma.connection.count({ where: { userId } }),
      this.prisma.friendRequest.count({
        where: { receiverId: userId, status: 'PENDING' },
      }),
    ]);

    return { connections, pending };
  }
}
