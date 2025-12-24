// src/user/user.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // =========================
  // PROFILE
  // =========================
  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.userService.getProfile(req.user.userId);
  }

  @Post('profile')
  async updateProfile(@Req() req: any, @Body() body: any) {
    return this.userService.updateProfile(req.user.userId, body);
  }

  // =========================
  // PROFILE STATS
  // =========================
  @Get('stats')
  async getUserStats(@Req() req: any) {
    return this.userService.getUserStats(req.user.userId);
  }

  // =========================
  // USER SEARCH (Connections)
  // =========================
  @Get('search')
  async searchUsers(
    @Req() req: any,
    @Query('q') query: string, // 🔴 q is correct
  ) {
    return this.userService.searchUsers(
      query,
      req.user.userId,
    );
  }
}
