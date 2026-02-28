import { Controller, Get, Post, Body } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { ok: true };
  }

  @Get('api/users')
  getUsers() {
    return { users: [{ id: 1, email: 'user@example.com' }] };
  }

  @Post('api/login')
  login(@Body() body: { email?: string }) {
    return {
      message: 'ok',
      user: { email: body?.email || 'anonymous', role: 'user' },
    };
  }
}
