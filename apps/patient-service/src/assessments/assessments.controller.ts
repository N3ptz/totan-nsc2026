import { Controller, Post, Get, Patch, Body, Param, Request, UnauthorizedException } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

@Controller('assessments')
export class AssessmentsController {
  constructor(private assessmentsService: AssessmentsService) {}

  // POST /assessments — แพทย์สร้างการประเมินใหม่
  @Post()
  create(@Body() dto: CreateAssessmentDto, @Request() req: any) {
    const doctorId = req.headers['x-user-id']; // Gateway inject หลัง verify JWT
    return this.assessmentsService.create(dto, doctorId);
  }

  // POST /assessments/:id/ai-result — AI service เรียก endpoint นี้เพื่อบันทึกผล (internal only)
  @Post(':id/ai-result')
  saveAiResult(@Param('id') id: string, @Body() result: any, @Request() req: any) {
    const secret = req.headers['x-internal-secret'];
    if (secret !== process.env.INTERNAL_SECRET) {
      throw new UnauthorizedException('Internal endpoint');
    }
    return this.assessmentsService.saveAiResult(id, result);
  }

  // GET /assessments/child/:childId — ดูประวัติทั้งหมดของเด็กคนนึง
  @Get('child/:childId')
  findByChild(@Param('childId') childId: string) {
    return this.assessmentsService.findByChild(childId);
  }

  // GET /assessments/:id — ดูรายละเอียด
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assessmentsService.findOne(id);
  }

  // POST /assessments/:id/mock-ai — จำลองผล AI (demo only)
  @Post(':id/mock-ai')
  mockAi(@Param('id') id: string) {
    return this.assessmentsService.mockAiResult(id);
  }

  // PATCH /assessments/:id/followup — บันทึกวันติดตาม
  @Patch(':id/followup')
  setFollowup(
    @Param('id') id: string,
    @Body() body: { date: Date; notes?: string },
  ) {
    return this.assessmentsService.setFollowup(id, body.date, body.notes);
  }
}
