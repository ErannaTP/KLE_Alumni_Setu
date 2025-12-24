import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from 'jsonwebtoken';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  constructor(private auth: AuthService) {}

  use(req: Request & { user?: any }, _res: Response, next: NextFunction) {
    const header = req.headers['authorization'] as string | undefined;

    if (!header) throw new UnauthorizedException('Missing token');

    const token = header.replace('Bearer ', '');
    const payload = this.auth.verifyToken(token);

    // verifyToken returns null | string | JwtPayload
    if (!payload) throw new UnauthorizedException('Invalid token');

    // If payload is an object and has userId, use it. Otherwise fail.
    if (typeof payload === 'object' && payload !== null && 'userId' in payload) {
      // payload is JwtPayload-ish; use a type-assertion for safety
      req.user = { userId: (payload as JwtPayload & { userId?: string }).userId };
      if (!req.user.userId) throw new UnauthorizedException('Invalid token payload');
    } else {
      // token payload isn't the shape we expect (string or missing userId)
      throw new UnauthorizedException('Invalid token payload');
    }

    next();
  }
}
