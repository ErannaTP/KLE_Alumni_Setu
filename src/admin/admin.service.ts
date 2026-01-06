import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AdminService {


    async sendBroadcastMessage(data: { recipients: string, specificEmail?: string, subject: string, message: string }) {
        let users: { email: string, name: string }[] = [];

        if (data.recipients === 'all-alumni') {
            users = await this.prisma.user.findMany({
                where: { role: 'ALUMNI' },
                select: { email: true, name: true }
            });
        } else if (data.recipients === 'all-students') {
            users = await this.prisma.user.findMany({
                where: { role: 'STUDENT' },
                select: { email: true, name: true }
            });
        } else if (data.recipients === 'specific') {
            if (!data.specificEmail) {
                throw new BadRequestException('Specific email is required');
            }
            users = [{ email: data.specificEmail, name: 'User' }];
        } else {
            throw new BadRequestException('Invalid recipient type');
        }

        if (users.length === 0) {
            return { success: false, message: 'No recipients found' };
        }

        // Configure Nodemailer (Reusing credentials - ideally use Env Vars)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'klealumnisetu@gmail.com',
                pass: 'qzukknazpqtjqfrs', // App Password
            },
        });

        let sentCount = 0;
        let failedCount = 0;

        // Send emails in a loop (basic implementation)
        // For large scale, use a queue system
        for (const user of users) {
            try {
                await transporter.sendMail({
                    from: '"Admin - Alumni Connect" <klealumnisetu@gmail.com>',
                    to: user.email,
                    subject: data.subject,
                    text: data.message, // Plain text fallback
                    html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                            <h2>Message from Admin</h2>
                            <p style="white-space: pre-wrap;">${data.message}</p>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                            <p style="font-size: 12px; color: #777;">This is a broadcast message from the KLE Alumni Connect Admin Portal.</p>
                          </div>`
                });
                sentCount++;
            } catch (error) {
                console.error(`Failed to send email to ${user.email}:`, error);
                failedCount++;
            }
        }

        return {
            success: true,
            message: `Message sent to ${sentCount} recipients` + (failedCount > 0 ? ` (${failedCount} failed)` : ''),
            sentCount
        };
    }
    constructor(
        private prisma: PrismaService,
    ) { }

    async login(email: string, pass: string) {
        const admin = await this.prisma.admin.findUnique({ where: { email } });
        if (!admin) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const isMatch = await bcrypt.compare(pass, admin.password);
        if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const payload = { email: admin.email, sub: admin.id, userId: admin.id, role: 'admin' };
        const token = jwt.sign(payload, process.env.JWT_ACCESS_SECRET || "test-secret", { expiresIn: '7d' });

        return {
            success: true,
            user: {
                email: admin.email,
                name: admin.name,
                role: 'admin',
            },
            token: token,
        };
    }

    async verifyToken(token: string) {
        try {
            const decoded: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET || "test-secret");
            if (decoded.role !== 'admin') {
                throw new UnauthorizedException();
            }
            return { success: true, user: decoded };
        } catch (e) {
            return { success: false };
        }
    }

    async getAllUsers() {
        // Read-only access to User table
        const users = await this.prisma.user.findMany({
            include: { student: true },
        });
        return { success: true, data: users };
    }

    async getAdminStats() {
        const students = await this.prisma.student.count();
        const alumni = await this.prisma.user.count({ where: { role: 'ALUMNI' } });
        return {
            success: true,
            data: { students, alumni, total: students + alumni },
        };
    }

    // --- Events CRUD ---
    async getEvents() {
        const events = await this.prisma.event.findMany({
            orderBy: { date: 'asc' },
            include: {
                _count: { select: { registrations: true } }
            }
        });
        return { success: true, data: events };
    }

    async createEvent(data: any) {
        const event = await this.prisma.event.create({
            data: {
                title: data.title,
                description: data.description,
                date: new Date(data.date), // Ensure date format
                location: data.location,
                type: data.tags?.[0] || 'other',
                maxAttendees: data.maxAttendees,
                isVirtual: data.isVirtual,
                tags: data.tags,
            },
        });
        return { success: true, data: event };
    }

    async updateEvent(id: string, data: any) {
        const event = await this.prisma.event.update({
            where: { id },
            data: {
                title: data.title,
                description: data.description,
                date: data.date ? new Date(data.date) : undefined,
                location: data.location,
                type: data.tags?.[0],
                maxAttendees: data.maxAttendees,
                isVirtual: data.isVirtual,
                tags: data.tags,
            },
        });
        return { success: true, data: event };
    }

    async deleteEvent(id: string) {
        // Use a transaction to delete registrations first, then the event
        await this.prisma.$transaction([
            this.prisma.eventRegistration.deleteMany({ where: { eventId: id } }),
            this.prisma.event.delete({ where: { id } })
        ]);
        return { success: true };
    }

    async getEventRegistrations(eventId: string) {
        const registrations = await this.prisma.eventRegistration.findMany({
            where: { eventId },
            include: {
                user: {
                    select: { id: true, name: true, email: true } // Fetch minimal user info
                }
            }
        });
        return { success: true, data: registrations };
    }

    async toggleAttendance(registrationId: string) {
        const reg = await this.prisma.eventRegistration.findUnique({
            where: { id: registrationId }
        });
        if (!reg) throw new Error("Registration not found");

        await this.prisma.eventRegistration.update({
            where: { id: registrationId },
            data: { attended: !reg.attended }
        });
        return { success: true };
    }

    // --- User Management (Create/Delete) ---
    // Note: We use the existing User model for this to maintain compatibility
    async createUser(data: any) {
        // Basic implementation - in real app, reuse Auth register service
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email: data.email,
                passwordHash: hashedPassword,
                name: data.name,
                role: data.role === 'student' ? 'STUDENT' : 'ALUMNI',
                student: data.role === 'student' ? {
                    create: { branch: data.branch, batchYear: parseInt(data.year) || 2024 }
                } : undefined,
                // For alumni we'd add fields to User directly per schema
                batchYear: data.role === 'alumni' ? parseInt(data.batch) || 2020 : undefined,
                company: data.company,
                position: data.currentRole
            },
        });
        return { success: true, data: user };
    }

    async updateUser(id: string, data: any) {
        // Prepare update data for User model
        const userUpdateData: any = {
            name: data.name,
            email: data.email,
            role: data.role === 'student' ? 'STUDENT' : 'ALUMNI',
            // Update common fields
            company: data.company,
            position: data.currentRole, // Map from frontend 'currentRole' to backend 'position'
            bio: data.achievements,    // Map from frontend 'achievements' to backend 'bio'
            batchYear: data.role === 'alumni' ? (parseInt(data.batch) || undefined) : undefined,
        };

        // If password is provided and not empty, hash and update it
        if (data.password && data.password.trim() !== '') {
            userUpdateData.passwordHash = await bcrypt.hash(data.password, 10);
        }

        // Prepare update data for Student model if related
        let studentUpdate = undefined;
        if (data.role === 'student' && (data.branch || data.year || data.domain || data.description)) {
            studentUpdate = this.prisma.student.upsert({
                where: { userId: id },
                create: {
                    userId: id,
                    branch: data.branch,
                    batchYear: parseInt(data.year) || 2024,
                    domains: data.domain ? [data.domain] : [],
                    bio: data.description
                },
                update: {
                    branch: data.branch,
                    batchYear: parseInt(data.year) || undefined,
                    domains: data.domain ? [data.domain] : undefined,
                    bio: data.description
                }
            });
        }

        // Execute updates
        const userUpdate = this.prisma.user.update({
            where: { id },
            data: userUpdateData
        });

        if (studentUpdate) {
            await this.prisma.$transaction([userUpdate, studentUpdate]);
        } else {
            await userUpdate;
        }

        return { success: true };
    }

    async deleteUser(id: string) {
        // Explicitly delete ALL related records to avoid Foreign Key Constraint violations
        // We use a transaction to ensure atomicity

        // 1. Fetch user's posts to delete their related content (comments/likes by OTHERS on these posts)
        const userPosts = await this.prisma.post.findMany({ where: { userId: id }, select: { id: true } });
        const userPostIds = userPosts.map(p => p.id);

        // 2. Fetch conversations to delete messages in them
        const userConversations = await this.prisma.conversation.findMany({
            where: { OR: [{ userAId: id }, { userBId: id }] },
            select: { id: true }
        });
        const userConversationIds = userConversations.map(c => c.id);

        await this.prisma.$transaction([
            // --- A. Content Cleanup (User's Posts) ---
            // Delete comments by OTHERS on user's posts
            this.prisma.comment.deleteMany({ where: { postId: { in: userPostIds } } }),
            // Delete likes by OTHERS on user's posts
            this.prisma.like.deleteMany({ where: { postId: { in: userPostIds } } }),
            // Delete the posts themselves
            this.prisma.post.deleteMany({ where: { id: { in: userPostIds } } }),

            // --- B. Content Cleanup (User's Activity) ---
            // Delete comments made BY the user on ANY post
            this.prisma.comment.deleteMany({ where: { userId: id } }),
            // Delete likes made BY the user on ANY post
            this.prisma.like.deleteMany({ where: { userId: id } }),

            // --- C. Social Cleanup (Messaging) ---
            // Delete messages in conversations involving the user
            this.prisma.message.deleteMany({ where: { conversationId: { in: userConversationIds } } }),
            // Delete the conversations themselves
            this.prisma.conversation.deleteMany({ where: { id: { in: userConversationIds } } }),

            // --- D. Social Cleanup (Relations) ---
            // Friend Requests (Sent or Received)
            this.prisma.friendRequest.deleteMany({ where: { OR: [{ senderId: id }, { receiverId: id }] } }),
            // Connections (User or Friend)
            this.prisma.connection.deleteMany({ where: { OR: [{ userId: id }, { friendId: id }] } }),
            // Follows (Follower or Following)
            this.prisma.follow.deleteMany({ where: { OR: [{ followerId: id }, { followingId: id }] } }),

            // --- E. Event Cleanup ---
            this.prisma.eventRegistration.deleteMany({ where: { userId: id } }),

            // --- F. Profile Cleanup ---
            this.prisma.student.deleteMany({ where: { userId: id } }),

            // --- G. User Deletion ---
            this.prisma.user.delete({ where: { id } })
        ]);

        return { success: true };
    }
}
