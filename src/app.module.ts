import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { JwtAuthMiddleware } from './auth/jwt-auth.middleware';

import { PrismaModule } from './prisma/prisma.module';
import { PostsModule } from './posts/posts.module';
import { UserModule } from './user/user.module';
import { ChatModule } from "./chat/chat.module";
import { AuthModule } from './auth/auth.module';
import { StudentModule } from './student/student.module';


import { ConnectionsModule } from './connections/connections.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/',
    }),

    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public', 'uploads'),
      serveRoot: '/uploads',
    }),

    PrismaModule,
    AuthModule,
    PostsModule,
    UserModule,
    ChatModule,
    ConnectionsModule,
    StudentModule,
    AdminModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtAuthMiddleware).exclude(
      'auth/signup',
      'auth/login',
      'admin/login',
      'admin/verify',
    ).forRoutes('*');
  }
}
