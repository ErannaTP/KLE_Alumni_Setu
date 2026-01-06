import {
  Controller,
  Post,
  Body,
  Req,
  Get,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Request } from "express";
import { Public } from './public.decorator';

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) { }

  // ---------------- SIGNUP (STUDENTS ONLY) ----------------
  @Public()
  @Post("student/signup")
  async studentSignup(@Body() body: any) {
    return this.auth.studentSignup(
      body.email,
      body.password,
      body.name,
      body.branch,
      body.batchYear
    );
  }

  @Public()
  @Post("student/login")
  async studentLogin(@Body() body: any) {
    return this.auth.studentLogin(
      body.email,
      body.password
    );
  }
  // ---------------- LOGIN (STUDENTS + ALUMNI) ----------------
  @Public()
  @Post("login")
  async login(@Body() body: any) {
    return this.auth.login(body.email, body.password);
  }

  // ---------------- FORGOT PASSWORD ----------------
  @Public()
  @Post("forgot-password")
  async forgotPassword(@Body() body: any) {
    return this.auth.forgotPassword(body.email, body.role);
  }

  @Public()
  @Post("reset-password-otp")
  async resetPasswordWithOtp(@Body() body: any) {
    return this.auth.resetPasswordWithOtp(body.email, body.otp, body.newPassword, body.role);
  }

  // ---------------- RESET PASSWORD (FIRST LOGIN ONLY) ----------------
  @Post("reset-password")
  async resetPassword(
    @Req() req: Request,
    @Body("newPassword") newPassword?: string
  ) {
    const userId = (req as any).user.userId;
    return this.auth.resetPassword(userId, newPassword);
  }

  @Get("me")
  async me(@Req() req: Request) {
    return (req as any).user;
  }
}
