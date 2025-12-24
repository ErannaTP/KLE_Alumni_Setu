// src/posts/posts.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
  Delete,
  Param,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Get()
  async getFeed(
    @Req() req: any,
    @Query('domain') domain: string,
    @Query('hashtag') hashtag: string,
    @Query('skip') skip: string,
    @Query('take') take: string,
  ) {
    return this.postsService.getFeed(
      req.user.userId,
      domain || null,
      hashtag || null,
      Number(skip || 0),
      Number(take || 20),
    );
  }

  @Post()
  async createPost(@Req() req: any, @Body() body: any) {
    return this.postsService.createPost({
      userId: req.user.userId,
      title: body.title,
      content: body.content,
      domain: body.domain || null,
      hashtags: body.hashtags || [],
      imageUrls: body.imageUrls || [],
    });
  }

  @Post('like')
  async likePost(@Req() req: any, @Body() body: any) {
    return this.postsService.likePost(req.user.userId, body.postId);
  }

  @Post('comment')
  async commentOnPost(@Req() req: any, @Body() body: any) {
    return this.postsService.commentOnPost(
      req.user.userId,
      body.postId,
      body.text,
    );
  }

  @Get('comments')
  async getComments(@Query('postId') postId: string) {
    return this.postsService.getPostComments(postId);
  }

  // ✅ DELETE POST (OWNER ONLY)
  @Delete(':id')
  async deletePost(@Req() req: any, @Param('id') postId: string) {
    return this.postsService.deletePost(req.user.userId, postId);
  }

  @Post('upload-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './public/uploads',
        filename: (_, file, cb) => {
          cb(null, `${Date.now()}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return { url: `/uploads/${file.filename}` };
  }
}
