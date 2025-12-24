import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  //------------------------------------------------------
  // SIGNUP
  //------------------------------------------------------
  async signup(email: string, password: string, name: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    const token = this.createToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  //------------------------------------------------------
  // LOGIN
  //------------------------------------------------------
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    const token = this.createToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  //------------------------------------------------------
  // JWT CREATE + VERIFY
  //------------------------------------------------------
  private createToken(userId: string) {
    return jwt.sign(
      { userId },
      process.env.JWT_ACCESS_SECRET || 'test-secret',
      { expiresIn: '7d' },
    );
  }

  verifyToken(token: string) {
    try {
      return jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'test-secret');
    } catch {
      return null;
    }
  }
}
