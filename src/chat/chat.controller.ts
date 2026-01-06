import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Req,
  Patch,
  Param,
} from "@nestjs/common";
import { ChatService } from "./chat.service";
import { Request } from "express";
import Ably from "ably";

@Controller("chat")
export class ChatController {
  constructor(private chat: ChatService) {}

  private me(req: Request): string {
    return (req as any).user.userId;
  }

  // ---------------- ABLY TOKEN ----------------
  @Get("ably-token")
  async ablyToken(@Req() req: Request) {
    const userId = (req as any).user.userId;

    const ably = new Ably.Rest({
      key: process.env.ABLY_API_KEY!, // 🔐 backend only
    });

    return await ably.auth.createTokenRequest({
      clientId: userId,
    });
  }

  // ---------------- CONVERSATIONS ----------------
  @Get("conversations")
  async conversations(@Req() req: Request) {
    return this.chat.getConversationsForUser(this.me(req));
  }

  // ---------------- SEND MESSAGE ----------------
  @Post("send")
  async send(@Req() req: Request, @Body() body: any) {
    const senderId = this.me(req);
    const { receiverId, content, replyToId } = body;

    return this.chat.sendMessage(
      senderId,
      receiverId,
      content,
      replyToId
    );
  }

  // ---------------- GET MESSAGES ----------------
  @Get("messages")
  async messages(@Req() req: Request, @Query("userId") other: string) {
    const me = this.me(req);
    return this.chat.getMessages(me, other);
  }

  // ---------------- EDIT MESSAGE ----------------
  @Patch(":id")
  async edit(
    @Req() req: Request,
    @Param("id") id: string,
    @Body("content") content: string
  ) {
    return this.chat.editMessage(this.me(req), id, content);
  }

  // ---------------- MARK SEEN ----------------
  @Post(":id/seen")
  async seen(@Req() req: Request, @Param("id") id: string) {
    const userId = (req as any).user.userId;
    return this.chat.markSeen(userId, id);
  }

  @Post("conversation/:id/seen")
  async markConversationSeen(
    @Req() req: Request,
    @Param("id") conversationId: string,
  ) {
    return this.chat.markConversationSeen(
      (req as any).user.userId,
      conversationId
    );
  }

  @Post(":id/delivered")
  async delivered(@Param("id") id: string) {
    return this.chat.markDelivered(id);
  }

  // ---------------- DELETE MESSAGE ----------------
  @Post(":id/delete")
  async deleteMessage(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    return this.chat.deleteMessage(
      (req as any).user.userId,
      id
    );
  }
}
