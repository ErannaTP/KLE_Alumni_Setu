import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { JwtAuthMiddleware } from './auth/jwt-auth.middleware';

import { PrismaModule } from './prisma/prisma.module';
import { PostsModule } from './posts/posts.module';
import { UserModule } from './user/user.module';
import { ChatModule } from "./chat/chat.module";
import { AuthModule } from './auth/auth.module';

import { ConnectionsModule } from './connections/connections.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public', 'uploads'),
      serveRoot: '/uploads',
    }),

    PrismaModule,
    AuthModule,
    PostsModule,
    UserModule,
    ChatModule,
    ConnectionsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtAuthMiddleware).exclude(
      'auth/signup',
      'auth/login',
      'public/(.*)',
    ).forRoutes('*');
  }
}
