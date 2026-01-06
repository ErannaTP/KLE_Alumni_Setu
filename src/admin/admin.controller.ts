import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Post('login')
    async login(@Body() body: any) {
        return this.adminService.login(body.email, body.password);
    }

    @Post('verify')
    async verify(@Body() body: any) {
        // The frontend sends token in body or header. 
        // The service expects the raw token string.
        return this.adminService.verifyToken(body.token);
    }

    @Get('users')
    async getAllUsers() {
        return this.adminService.getAllUsers();
    }

    @Get('stats')
    async getStats() {
        return this.adminService.getAdminStats();
    }

    @Get('events')
    async getEvents() {
        return this.adminService.getEvents();
    }

    @Post('events')
    async createEvent(@Body() body: any) {
        return this.adminService.createEvent(body);
    }

    @Put('events/:id')
    async updateEvent(@Param('id') id: string, @Body() body: any) {
        return this.adminService.updateEvent(id, body);
    }

    @Delete('events/:id')
    async deleteEvent(@Param('id') id: string) {
        return this.adminService.deleteEvent(id);
    }

    @Post('users')
    async createUser(@Body() body: any) {
        return this.adminService.createUser(body);
    }

    @Put('users/:id')
    async updateUser(@Param('id') id: string, @Body() body: any) {
        return this.adminService.updateUser(id, body);
    }

    @Delete('users/:id')
    async deleteUser(@Param('id') id: string) {
        return this.adminService.deleteUser(id);
    }

    @Post('send-broadcast')
    async sendBroadcast(@Body() body: any) {
        return this.adminService.sendBroadcastMessage(body);
    }
}
