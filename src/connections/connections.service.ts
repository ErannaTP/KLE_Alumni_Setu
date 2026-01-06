// src/connections/connections.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConnectionsService {
  constructor(private prisma: PrismaService) {}

  // ---------------- SEND REQUEST ----------------
  async sendRequest(
    senderId: string,
    senderType: 'ALUMNI' | 'STUDENT',
    receiverId: string,
    receiverType: 'ALUMNI' | 'STUDENT',
  ) {
    if (senderId === receiverId && senderType === receiverType) {
      throw new BadRequestException('Cannot connect with yourself');
    }

    return this.prisma.friendRequest.create({
      data: {
        senderId,
        senderType,
        receiverId,
        receiverType,
      },
    });
  }

  // ---------------- GET PENDING REQUESTS ----------------
  async getPendingRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING',
      },
      include: {
        senderUser: {   // 👈 relation to User
          select: {
            id: true,
            name: true,
            profilePic: true,
            role: true,
          },
        },
      },
    });
  }

  // ---------------- ACCEPT REQUEST ----------------
  async acceptRequest(userId: string, requestId: string) {
  // 1️⃣ Fetch request
  const request = await this.prisma.friendRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new BadRequestException("Request not found");
  }

  if (request.receiverId !== userId) {
    throw new BadRequestException("Not authorized to accept this request");
  }

  // 2️⃣ Mark request as accepted
  await this.prisma.friendRequest.update({
    where: { id: requestId },
    data: { status: "ACCEPTED" },
  });

  // 3️⃣ Create bidirectional connection (ALUMNI ↔ STUDENT allowed)
  await this.prisma.connection.createMany({
    data: [
      {
        userId: request.senderId,
        userType: request.senderType,
        friendId: request.receiverId,
        friendType: request.receiverType,
      },
      {
        userId: request.receiverId,
        userType: request.receiverType,
        friendId: request.senderId,
        friendType: request.senderType,
      },
    ],
  });

  // 4️⃣ Create conversation for ALL accepted connections
  const userA = [request.senderId, request.receiverId].sort()[0];
  const userB = [request.senderId, request.receiverId].sort()[1];

  await this.prisma.conversation.upsert({
    where: {
      userAId_userBId: {
        userAId: userA,
        userBId: userB,
      },
    },
    update: {}, // already exists → do nothing
    create: {
      userAId: userA,
      userBId: userB,
    },
  });

    return { success: true };
  }

  // ---------------- DECLINE ----------------
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

  // ---------------- GET CONNECTIONS ----------------
  async getConnections(userId: string) {
  return this.prisma.connection.findMany({
    where: { userId },
    include: {
      friend: { // ✅ correct relation name
        select: {
          id: true,
          name: true,
          profilePic: true,
          role: true,
        },
      },
    },
  });
}

  // ---------------- STATS ----------------
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
