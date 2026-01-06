// src/user/user.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  // =========================
  // ALUMNI PROFILE
  // =========================
  @Get('profile')
  async getProfile(@Req() req: any) {
    if (req.user.role !== 'ALUMNI') {
      throw new UnauthorizedException('Alumni access only');
    }
    return this.userService.getProfile(req.user.userId);
  }

  @Post('profile')
  async updateProfile(@Req() req: any, @Body() body: any) {
    if (req.user.role !== 'ALUMNI') {
      throw new UnauthorizedException('Alumni access only');
    }
    return this.userService.updateProfile(req.user.userId, body);
  }

  // =========================
  // PROFILE STATS (ALUMNI ONLY)
  // =========================
  @Get('stats')
  async getUserStats(@Req() req: any) {
    if (req.user.role !== 'ALUMNI') {
      throw new UnauthorizedException();
    }
    return this.userService.getUserStats(req.user.userId);
  }

  // =========================
  // USER SEARCH (STUDENT + ALUMNI) ✅ FINAL FIX
  // =========================
  @Get('search')
  async searchUsers(
    @Req() req: any,
    @Query('q') query: string,
  ) {
    // 🔥 ONLY REQUIRE AUTHENTICATION
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.userService.searchUsers(
      query,
      req.user.userId,
    );
  }

  // =========================
  // EVENTS
  // =========================
  @Get('events')
  async getEvents(@Req() req: any) {
    if (!req.user) throw new UnauthorizedException();
    return this.userService.fetchEvents(req.user.userId);
  }

  @Post('events/:id/register')
  async registerForEvent(@Req() req: any, @Param('id') eventId: string) {
    if (!req.user) throw new UnauthorizedException();
    return this.userService.registerForEvent(req.user.userId, eventId);
  }
}
