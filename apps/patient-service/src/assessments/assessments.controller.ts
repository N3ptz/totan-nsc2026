import { Controller, Post, Get, Patch, Body, Param, Request, UnauthorizedException, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { StorageService } from '../storage/storage.service';

@Controller('assessments')
export class AssessmentsController {
  constructor(
    private assessmentsService: AssessmentsService,
    private storageService: StorageService,
  ) {}

  // POST /assessments/upload-xray — อัปโหลดภาพ X-ray → คืน URL
  @Post('upload-xray')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadXray(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('ไม่พบไฟล์');
    const url = await this.storageService.upload(file, 'xrays');
    return { xrayImageUrl: url };
  }

  // POST /assessments/upload-heatmap — AI service อัปโหลด Grad-CAM heatmap → คืน URL
  @Post('upload-heatmap')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadHeatmap(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('ไม่พบไฟล์');
    const secret = req.headers['x-internal-secret'];
    if (secret !== process.env.INTERNAL_SECRET) {
      throw new UnauthorizedException('Internal endpoint');
    }
    const url = await this.storageService.upload(file, 'heatmaps');
    return { heatmapUrl: url };
  }

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
