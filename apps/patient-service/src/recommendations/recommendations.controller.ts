import { Controller, Get, Post, Patch, Body, Param, Request, ForbiddenException } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { getRequestUser, requireDoctor } from '../common/request-user';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private recsService: RecommendationsService) {}

  // POST /recommendations — เฉพาะแพทย์เจ้าของ assessment
  @Post()
  create(
    @Body() body: { assessmentId: string; parentId: string; content: string; mediaUrl?: string },
    @Request() req: any,
  ) {
    const { userId } = requireDoctor(req);
    return this.recsService.create({ ...body, doctorId: userId });
  }

  // GET /recommendations/mine — ผู้ปกครองดูคำแนะนำของตัวเอง
  @Get('mine')
  findMine(@Request() req: any) {
    const { userId } = getRequestUser(req);
    return this.recsService.findByParent(userId);
  }

  // GET /recommendations/sent — แพทย์ดูคำแนะนำที่ตัวเองส่งไปแล้ว
  @Get('sent')
  findSent(@Request() req: any) {
    const { userId } = requireDoctor(req);
    return this.recsService.findByDoctor(userId);
  }

  // PATCH /recommendations/:id/read — ผู้ปกครองเจ้าของกดอ่านแล้ว
  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Request() req: any) {
    const { userId } = getRequestUser(req);
    const rec = await this.recsService.findOne(id);
    if (rec.parentId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์');
    return this.recsService.markRead(id);
  }
}
