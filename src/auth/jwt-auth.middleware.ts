import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  constructor(private auth: AuthService) { }

  use(req: Request & { user?: any }, _res: Response, next: NextFunction) {
    const publicPaths = [
      '/api/auth/login',
      '/api/auth/signup',
      '/api/auth/student/login',
      '/api/auth/student/signup',
      '/pages/',
      '/assets/',
      '/css/',
      '/js/',
      '/uploads/',
      '/favicon.ico',
      '/admin-login.html',
      '/admin-dashboard.html',
      '/api/auth/forgot-password',
      '/api/auth/reset-password-otp',
    ];

    // 🔓 IMPORTANT: use originalUrl, not path
    // Allow root '/' explicitly, or matching prefixes
    if (req.originalUrl === '/' || publicPaths.some(p => req.originalUrl.startsWith(p))) {
      return next();
    }

    const header = req.headers['authorization'] as string | undefined;

    if (!header) {
      throw new UnauthorizedException('Missing token');
    }

    const token = header.replace('Bearer ', '');
    const payload = this.auth.verifyToken(token);

    if (!payload || typeof payload !== 'object') {
      throw new UnauthorizedException('Invalid token');
    }

    const { userId, role } = payload as any;

    if (!userId || !role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // ✅ Attach BOTH userId and role
    req.user = {
      userId,
      role,
    };


    next();
  }

}

export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    return !!request.user;
  }
}
