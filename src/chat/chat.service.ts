import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import Ably from 'ably';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  private ably: Ably.Realtime;

  constructor(private prisma: PrismaService) {
    const key = process.env.ABLY_API_KEY;
    this.ably = key
      ? new Ably.Realtime(key)
      : new Ably.Realtime({ key: 'test:no-key' });
  }

  // Stable channel name
  private channelName(a: string, b: string) {
    return a < b ? `chat:${a}:${b}` : `chat:${b}:${a}`;
  }

  private getChannel(a: string, b: string) {
    return this.ably.channels.get(this.channelName(a, b));
  }

  // ---------------- CONVERSATION HELPERS ----------------

  private async getOrCreateConversation(a: string, b: string) {
    const [u1, u2] = a <= b ? [a, b] : [b, a];

    let convo = await this.prisma.conversation.findUnique({
      where: { userAId_userBId: { userAId: u1, userBId: u2 } },
    });

    if (!convo) {
      convo = await this.prisma.conversation.create({
        data: { userAId: u1, userBId: u2 },
      });
    }

    return convo;
  }

  private async findConversation(a: string, b: string) {
    const [u1, u2] = a <= b ? [a, b] : [b, a];

    return this.prisma.conversation.findUnique({
      where: { userAId_userBId: { userAId: u1, userBId: u2 } },
    });
  }

  // ---------------- CONVERSATIONS LIST ----------------

  async getConversationsForUser(userId: string) {
    const convos = await this.prisma.conversation.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        userA: true,
        userB: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return Promise.all(
      convos.map(async (c) => {
        const other = c.userAId === userId ? c.userB : c.userA;

        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: c.id,
            receiverId: userId,
            seenAt: null,
          },
        });

        return {
          id: c.id,
          otherUserId: other.id,
          otherUserName: other.name,
          lastMessage: c.messages[0] ?? null,
          unreadCount,
          updatedAt: c.updatedAt,
        };
      })
    );
  }

  // ---------------- SEND MESSAGE ----------------

  async sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
    replyToId?: string,
  ) {
    const [userAId, userBId] =
      senderId < receiverId
        ? [senderId, receiverId]
        : [receiverId, senderId];

    let conversation = await this.prisma.conversation.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { userAId, userBId },
      });
    }

    const message = await this.prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
        replyToId,
        conversationId: conversation.id,
      },
    });

    // 🔴 REALTIME: Publish to Ably
    const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
    const channelName = `chat:${conversation.id}`;

    await ably.channels.get(channelName).publish("new-message", {
      ...message,
    });

    return message;
  }


  // ---------------- GET MESSAGES ----------------

  async getMessages(me: string, other: string) {
    const [userAId, userBId] =
      me < other ? [me, other] : [other, me];

    const conversation = await this.prisma.conversation.findUnique({
      where: {
        userAId_userBId: {
          userAId,
          userBId,
        },
      },
    });

    if (!conversation) return [];

    return this.prisma.message.findMany({
      where: {
        conversationId: conversation.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  // ---------------- EDIT MESSAGE ----------------

  async editMessage(userId: string, id: string, content: string) {
    const msg = await this.prisma.message.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException();
    if (msg.senderId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.message.update({
      where: { id },
      data: { content, edited: true },
    });

    this.getChannel(msg.senderId, msg.receiverId).publish(
      'edit-message',
      updated
    );

    return updated;
  }

  // ---------------- MARK SINGLE SEEN ----------------

  async markSeen(userId: string, messageId: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!msg || msg.receiverId !== userId || msg.seenAt) return null;

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { seenAt: new Date() },
    });

    // 🔔 Publish seen event (single source of truth)
    const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
    await ably.channels
      .get(`chat:${updated.conversationId}`)
      .publish("message-seen", {
        messageId: updated.id,
        seenAt: updated.seenAt,
      });

    return updated;
  }

  async markConversationSeen(userId: string, conversationId: string) {
  const unseen = await this.prisma.message.findMany({
    where: {
      conversationId,
      receiverId: userId,
      seenAt: null,
    },
  });

  if (!unseen.length) return;

  const now = new Date();

  await this.prisma.message.updateMany({
    where: {
      id: { in: unseen.map(m => m.id) },
    },
    data: { seenAt: now },
  });

  const ably = new Ably.Rest(process.env.ABLY_API_KEY!);

  for (const msg of unseen) {
    await ably.channels
      .get(`chat:${conversationId}`)
      .publish("message-seen", {
        messageId: msg.id,
        seenAt: now,
      });
  }
}

// ---------------- DELETE MESSAGE ----------------
async deleteMessage(userId: string, id: string) {
  const msg = await this.prisma.message.findUnique({ where: { id } });
  if (!msg) throw new NotFoundException();

  if (msg.senderId !== userId) {
    throw new ForbiddenException("You can only delete your own messages");
  }

  await this.prisma.message.delete({ where: { id } });

  // 🔔 Notify realtime clients
  const ably = new Ably.Rest(process.env.ABLY_API_KEY!);
  await ably.channels
    .get(`chat:${msg.conversationId}`)
    .publish("delete-message", { messageId: id });

  return { success: true };
}

  async markDelivered(messageId: string) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { deliveredAt: new Date() },
    });
  }

  async getMessagesByConversation(
    userId: string,
      conversationId: string
    ) {
      const convo = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!convo) return [];

      // Ensure user belongs to this conversation
      if (convo.userAId !== userId && convo.userBId !== userId) {
        throw new ForbiddenException();
      }

      const messages = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
      });

      // Mark only received messages as seen
      await this.prisma.message.updateMany({
        where: {
          conversationId,
          receiverId: userId,
          seenAt: null,
        },
        data: { seenAt: new Date() },
      });
  return messages;
  }
}
