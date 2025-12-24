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
  async getAblyToken(@Req() req: Request) {
    const userId = this.me(req);

    const ably = new Ably.Rest(process.env.ABLY_API_KEY!);

    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: userId, // IMPORTANT: ties socket to user
    });

    return tokenRequest;
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
    return this.chat.markSeen(this.me(req), id);
  }
}
