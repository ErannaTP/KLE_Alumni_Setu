// src/connections/connections.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Param,
} from '@nestjs/common';
import { ConnectionsService } from './connections.service';

@Controller('connections')
export class ConnectionsController {
  constructor(private readonly service: ConnectionsService) {}

  @Post('request')
  sendRequest(@Req() req: any, @Body('receiverId') receiverId: string) {
    return this.service.sendRequest(req.user.userId, receiverId);
  }

  @Get('requests')
    getPending(@Req() req: any) {
    return this.service.getPendingRequests(req.user.userId);
    }   

  @Post('accept/:id')
  accept(@Req() req: any, @Param('id') id: string) {
    return this.service.acceptRequest(req.user.userId, id);
  }

  @Post('decline/:id')
  decline(@Req() req: any, @Param('id') id: string) {
    return this.service.declineRequest(req.user.userId, id);
  }

  @Get()
  getConnections(@Req() req: any) {
    return this.service.getConnections(req.user.userId);
  }

  @Get('stats')
  getStats(@Req() req: any) {
    return this.service.getStats(req.user.userId);
  }
}
