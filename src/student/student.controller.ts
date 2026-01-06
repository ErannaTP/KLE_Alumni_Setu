// src/student/student.controller.ts
import {
  Controller,
  Get,
  Post,
  Req,
  Body,
  UnauthorizedException,
} from "@nestjs/common";
import { StudentService } from "./student.service";

@Controller("student")
export class StudentController {
  constructor(private readonly service: StudentService) {}

  // =========================
  // STUDENT PROFILE
  // =========================
  @Get("profile")
  async getProfile(@Req() req: any) {
    return this.service.getProfile(req.user.userId);
  }

  @Post("profile")
  async updateProfile(@Req() req: any, @Body() body: any) {
    return this.service.updateProfile(req.user.userId, body);
  }
}
