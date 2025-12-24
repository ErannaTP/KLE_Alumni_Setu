import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { ChatService } from "./chat.service";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server; // ✅ FIXED HERE

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) throw new Error("No token");

      const payload = this.jwtService.verify(token);

      client.data.userId = payload.userId;
      client.join(payload.userId);

      console.log("✅ Socket connected:", payload.userId);
    } catch (err) {
      console.log("❌ Socket auth failed");
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log("🔌 Socket disconnected:", client.data?.userId);
  }
}
