import { Controller, Get, Post, Patch, Body, Param, Request, ForbiddenException } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private recsService: RecommendationsService) {}

  // POST /recommendations — เฉพาะแพทย์เท่านั้น
  @Post()
  create(
    @Body() body: { assessmentId: string; parentId: string; content: string; mediaUrl?: string },
    @Request() req: any,
  ) {
    const doctorId = req.headers['x-user-id'];
    const role = req.headers['x-user-role'];
    if (role !== 'doctor') throw new ForbiddenException('เฉพาะแพทย์เท่านั้น');
    return this.recsService.create({ ...body, doctorId });
  }

  // GET /recommendations/mine — ผู้ปกครองดูคำแนะนำของตัวเอง
  @Get('mine')
  findMine(@Request() req: any) {
    const parentId = req.headers['x-user-id'];
    return this.recsService.findByParent(parentId);
  }

  // PATCH /recommendations/:id/read — ผู้ปกครองเจ้าของกดอ่านแล้ว
  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Request() req: any) {
    const userId = req.headers['x-user-id'];
    const rec = await this.recsService.findOne(id);
    if (rec.parentId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์');
    return this.recsService.markRead(id);
  }
}
