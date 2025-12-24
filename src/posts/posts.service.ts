// src/posts/posts.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async getFeed(userId: string | null, domain: string | null, hashtag: string | null, skip = 0, take = 20) {
    const posts = await this.prisma.post.findMany({
      where: {
        ...(domain ? { domain } : {}),
        ...(hashtag ? { hashtags: { has: hashtag } } : {}),
      },
      include: { user: true, comments: true, likes: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    return posts.map(p => ({
      ...p,
      likesCount: p.likes.length,
      commentsCount: p.comments.length,
      userLiked: userId ? p.likes.some(l => l.userId === userId) : false,
    }));
  }

  async createPost(data: any) {
    return this.prisma.post.create({
      data,
      include: { user: true },
    });
  }

  async likePost(userId: string, postId: string) {
    const existing = await this.prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await this.prisma.like.delete({
        where: { userId_postId: { userId, postId } },
      });
      return { liked: false };
    }

    await this.prisma.like.create({ data: { userId, postId } });
    return { liked: true };
  }

  async commentOnPost(userId: string, postId: string, text: string) {
    return this.prisma.comment.create({
      data: { userId, postId, text },
      include: { user: true },
    });
  }

  async getPostComments(postId: string) {
    return this.prisma.comment.findMany({
      where: { postId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ✅ DELETE POST (OWNER ONLY)
  async deletePost(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.userId !== userId) {
      throw new ForbiddenException('Not allowed');
    }

    await this.prisma.comment.deleteMany({ where: { postId } });
    await this.prisma.like.deleteMany({ where: { postId } });
    await this.prisma.post.delete({ where: { id: postId } });

    return { success: true };
  }
}
