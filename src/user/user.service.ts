// src/user/user.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

  // =========================
  // PROFILE
  // =========================
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      ...user,
      isProfileComplete: this.isProfileComplete(user),
    };
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


  private isProfileComplete(user: any): boolean {
    // ALUMNI completion
    if (user.role === "ALUMNI") {
      return (
        !!user.bio &&
        Array.isArray(user.domains) &&
        user.domains.length >= 2
      );
    }

    // STUDENT completion → handled in StudentService
    return false;
  }

  // =========================
  // USER SEARCH
  // =========================
  async searchUsers(query: string, currentUserId: string) {
    if (!query || query.trim().length < 2) return [];

    // 1️⃣ Exclude connected + pending users
    const connections = await this.prisma.connection.findMany({
      where: {
        OR: [{ userId: currentUserId }, { friendId: currentUserId }],
      },
      select: { userId: true, friendId: true },
    });

    const connectedIds = connections.map(c =>
      c.userId === currentUserId ? c.friendId : c.userId,
    );

    const pending = await this.prisma.friendRequest.findMany({
      where: {
        OR: [{ senderId: currentUserId }, { receiverId: currentUserId }],
        status: 'PENDING',
      },
      select: { senderId: true, receiverId: true },
    });

    const excludedIds = [
      currentUserId,
      ...connectedIds,
      ...pending.flatMap(p => [p.senderId, p.receiverId]),
    ];

    // 2️⃣ Search USERS (both alumni & students)
    const users = await this.prisma.user.findMany({
      where: {
        id: { notIn: excludedIds },
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        profilePic: true,
        role: true,
        student: {
          select: {
            branch: true,
            batchYear: true,
          },
        },
      },
      take: 10,
    });

    return users;
  }
  // =========================
  // EVENTS (Public for Users)
  // =========================
  async fetchEvents(userId: string) {
    const events = await this.prisma.event.findMany({
      orderBy: { date: 'asc' },
      where: { date: { gte: new Date() } }, // Only future events
      include: {
        registrations: {
          where: { userId },
          select: { userId: true }
        },
        _count: { select: { registrations: true } } // Get accurate count
      }
    });

    return events.map(event => ({
      ...event,
      isRegistered: event.registrations.length > 0,
      attendeeCount: event._count.registrations,
      registrations: undefined, // Hide internal array
      _count: undefined
    }));
  }

  async registerForEvent(userId: string, eventId: string) {
    // 1. Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { _count: { select: { registrations: true } } }
    });
    if (!event) throw new Error("Event not found");

    // 2. Check duplicates
    const existing = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } }
    });
    if (existing) throw new Error("Already registered");

    // 3. Check capacity
    if (event.maxAttendees && event._count.registrations >= event.maxAttendees) {
      throw new Error("Event is full");
    }

    // 4. Register
    return this.prisma.eventRegistration.create({
      data: {
        userId,
        eventId
      }
    });
  }
}