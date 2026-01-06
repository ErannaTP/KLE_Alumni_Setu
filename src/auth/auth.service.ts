import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) { }

  //------------------------------------------------------
  // LOGIN
  //------------------------------------------------------
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { student: true } // Include student details
    });
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    const token = this.createToken(user.id, user.role === "STUDENT" ? "STUDENT" : "ALUMNI");

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        // Include specific student fields if they exist
        ...(user.student ? {
          branch: user.student.branch,
          batchYear: user.student.batchYear
        } : {})
      },
      passwordResetRequired: user.passwordResetRequired,
    };
  }

  async resetPassword(userId: string, newPassword?: string) {
    if (newPassword) {
      const passwordHash = await bcrypt.hash(newPassword, 10);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          passwordResetRequired: false,
        },
      });
    } else {
      // Skip case
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordResetRequired: false,
        },
      });
    }

    return { success: true };
  }


  //------------------------------------------------------
  // SIGNUP
  //------------------------------------------------------
  async studentSignup(
    email: string,
    password: string,
    name: string,
    branch?: string,
    batchYear?: number
  ) {
    email = email.toUpperCase();

    // 1️⃣ Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException("User already exists");
    }

    // 2️⃣ Create USER (identity)
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: "STUDENT",
        passwordResetRequired: false,
      },
    });

    // 3️⃣ Create STUDENT (profile)
    await this.prisma.student.create({
      data: {
        userId: user.id,
        branch,
        batchYear,
      },
    });

    // 4️⃣ Create token
    const token = this.createToken(user.id, "STUDENT");

    return {
      token,
      role: "STUDENT",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }


  async studentLogin(email: string, password: string) {
    email = email.toUpperCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { student: true }
    });

    if (!user || user.role !== "STUDENT") {
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const token = this.createToken(user.id, "STUDENT");

    return {
      token,
      role: "STUDENT",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        branch: user.student?.branch,
        batchYear: user.student?.batchYear
      },
    };
  }


  //------------------------------------------------------
  // JWT CREATE + VERIFY
  //------------------------------------------------------
  private createToken(userId: string, role: "ALUMNI" | "STUDENT") {
    return jwt.sign(
      { userId, role },
      process.env.JWT_ACCESS_SECRET || "test-secret",
      { expiresIn: "7d" }
    );
  }

  verifyToken(token: string) {
    try {
      return jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'test-secret');
    } catch {
      return null;
    }
  }

  //------------------------------------------------------
  // FORGOT PASSWORD (OTP)
  //------------------------------------------------------
  async forgotPassword(email: string, role?: string) {
    // ---------------- ADMIN LOGIC ----------------
    if (role === 'admin') {
      // Do not uppercase admin email (assume case sensitive or lowercase as per AdminService)
      const user = await this.prisma.admin.findUnique({ where: { email } });
      if (!user) throw new NotFoundException('Account does not exist');

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      try {
        await this.prisma.admin.update({
          where: { id: user.id },
          data: { otp, otpExpiry }
        });
      } catch (dbError) {
        console.error("CRITICAL DB ERROR during Admin OTP save:", dbError);
        throw new Error("Database failed to save OTP.");
      }

      await this.sendOtpEmailHelper(email, otp);
      return { success: true, message: 'OTP sent to your email.' };
    }

    // ---------------- STUDENT / ALUMNI LOGIC ----------------
    // email = email.toUpperCase(); // REMOVED: Allow mixed case input
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' }
      }
    });

    if (!user) {
      throw new NotFoundException('Account does not exist');
    }

    // Role Validation
    if (role) {
      const normalizedRole = role.toUpperCase(); // 'STUDENT' or 'ALUMNI'
      // Assume user.role is stored as 'STUDENT' or 'ALUMNI' in DB
      if (user.role !== normalizedRole) {
        // Mismatch found (e.g. Student trying to reset in Alumni tab)
        throw new NotFoundException('Account does not exist');
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save to DB
    try {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { otp, otpExpiry }
      });
    } catch (dbError) {
      console.error("CRITICAL DB ERROR during OTP save:", dbError);
      throw new Error("Database failed to save OTP. Please restart server if schema changed.");
    }

    await this.sendOtpEmailHelper(email, otp);
    return { success: true, message: 'OTP sent to your email.' };
  }

  // Refactored helper to avoid duplication
  private async sendOtpEmailHelper(email: string, otp: string) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'klealumnisetu@gmail.com',
          pass: 'qzukknazpqtjqfrs'
        }
      });

      console.log(`=========================================`);
      console.log(`[DEV OTP] For ${email}: ${otp}`);
      console.log(`=========================================`);

      await transporter.sendMail({
        from: 'KLE Alumni Connect <klealumnisetu@gmail.com>',
        to: email,
        subject: 'Password Reset OTP - KLE Alumni Connect',
        text: `Your OTP for password reset is: ${otp}. It expires in 10 minutes.`
      });
    } catch (e) {
      console.error("Failed to send OTP email", e);
    }
  }

  //------------------------------------------------------
  // RESET PASSWORD WITH OTP
  //------------------------------------------------------
  async resetPasswordWithOtp(email: string, otp: string, newPassword: string, role?: string) {
    // ---------------- ADMIN LOGIC ----------------
    if (role === 'admin') {
      const user = await this.prisma.admin.findUnique({ where: { email } });
      if (!user) throw new NotFoundException('User not found');

      if (user.otp !== otp) {
        throw new BadRequestException('Invalid OTP');
      }

      if (user.otpExpiry && new Date() > user.otpExpiry) {
        throw new BadRequestException('OTP Expired');
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await this.prisma.admin.update({
        where: { id: user.id },
        data: {
          password: passwordHash, // Admin model uses 'password'
          otp: null,
          otpExpiry: null
        }
      });
      return { success: true, message: 'Password reset successful.' };
    }

    // ---------------- STUDENT / ALUMNI LOGIC ----------------
    // email = email.toUpperCase(); // REMOVED: Allow mixed case input
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' }
      }
    });

    if (!user) throw new NotFoundException('User not found');

    if (user.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (user.otpExpiry && new Date() > user.otpExpiry) {
      throw new BadRequestException('OTP Expired');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update User
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        otp: null, // Clear OTP
        otpExpiry: null
      }
    });

    return { success: true, message: 'Password updated successfully' };
  }
}
