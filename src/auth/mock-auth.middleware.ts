// src/auth/mock-auth.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class MockAuthMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    // Prefer header set by frontend so two browsers can act as two different mock users.
    const fromHeader = (req.headers['x-mock-user-id'] as string) || (req.headers['x-mock-user-id'.toLowerCase()] as string);
    const uid = fromHeader || 'mock-user-1';

    req.user = {
      userId: uid,
      id: uid, // some code expects .id
      name: uid === 'mock-user-1' ? 'Mock User' : uid,
    };
    next();
  }
}
