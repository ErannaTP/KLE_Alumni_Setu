import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS for frontend
  app.enableCors({
    origin: true, // Allow any origin (for testing via file:// or different ports)
    credentials: true,
  });

  // 🔥 THIS IS THE IMPORTANT FIX
  app.setGlobalPrefix('api');

  await app.listen(5136);
  console.log('🚀 Backend running at http://localhost:5136');
  console.log('📌 API available at http://localhost:5136/api/... endpoints');
}

bootstrap();
