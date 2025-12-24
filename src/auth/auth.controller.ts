import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('signup')
  async signup(@Body() body: any) {
    return this.auth.signup(body.email, body.password, body.name);
  }

  @Post('login')
  async login(@Body() body: any) {
    return this.auth.login(body.email, body.password);
  }
}
