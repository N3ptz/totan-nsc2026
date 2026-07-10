import { Controller, Post, Get, Patch, Body, Param, Query, Request, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { AiResultDto } from './dto/ai-result.dto';
import { NotifyParentDto } from './dto/notify-parent.dto';
import { StorageService } from '../storage/storage.service';
import { InternalGuard } from '../common/internal.guard';
import { getRequestUser, requireDoctor } from '../common/request-user';

@Controller('assessments')
export class AssessmentsController {
  constructor(
    private assessmentsService: AssessmentsService,
    private storageService: StorageService,
  ) {}

  // POST /assessments/upload-xray — แพทย์อัปโหลดภาพ X-ray → คืน URL
  @Post('upload-xray')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadXray(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    requireDoctor(req);
    if (!file) throw new BadRequestException('ไม่พบไฟล์');
    const url = await this.storageService.upload(file, 'xrays');
    return { xrayImageUrl: url };
  }

  // POST /assessments/upload-heatmap — AI service อัปโหลด Grad-CAM heatmap (internal only)
  @Post('upload-heatmap')
  @UseGuards(InternalGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadHeatmap(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('ไม่พบไฟล์');
    const url = await this.storageService.upload(file, 'heatmaps');
    return { heatmapUrl: url };
  }

  // POST /assessments — แพทย์สร้างการประเมินใหม่ (ต้องเป็นเจ้าของเคส)
  @Post()
  create(@Body() dto: CreateAssessmentDto, @Request() req: any) {
    const { userId } = requireDoctor(req);
    return this.assessmentsService.create(dto, userId);
  }

  // POST /assessments/:id/ai-result — AI service บันทึกผล (internal only)
  @Post(':id/ai-result')
  @UseGuards(InternalGuard)
  saveAiResult(@Param('id') id: string, @Body() result: AiResultDto) {
    return this.assessmentsService.saveAiResult(id, result);
  }

  // POST /assessments/:id/ai-failed — AI service แจ้ง pipeline ล้มเหลว (internal only)
  @Post(':id/ai-failed')
  @UseGuards(InternalGuard)
  markFailed(@Param('id') id: string) {
    return this.assessmentsService.markFailed(id);
  }

  // GET /assessments/internal/count — auth-service ขอจำนวน assessment ทั้งหมด (admin stats, internal only)
  @Get('internal/count')
  @UseGuards(InternalGuard)
  async countAll() {
    return { count: await this.assessmentsService.countAll() };
  }

  // GET /assessments/internal/all — auth-service ขอรายการ assessment ล่าสุด (admin scans list, internal only)
  @Get('internal/all')
  @UseGuards(InternalGuard)
  findAllForAdmin(@Query('limit') limit?: string) {
    return this.assessmentsService.findAllForAdmin(limit ? Number(limit) : undefined);
  }

  // GET /assessments/mine — ผลประเมินทั้งหมดของผู้ใช้ (หมอ: เคสที่ตัวเองสร้าง / ผู้ปกครอง: ของลูกทุกคน)
  // ใช้กับหน้า Dashboard แทนการยิง child/:id ทีละคน (N+1) — ต้องประกาศก่อน ':id' ไม่งั้นโดน route จับเป็น id
  @Get('mine')
  findMine(@Request() req: any) {
    const user = getRequestUser(req);
    return this.assessmentsService.findMine(user);
  }

  // GET /assessments/child/:childId — ดูประวัติของเด็ก (แพทย์เจ้าของเคส / ผู้ปกครองของเด็ก)
  @Get('child/:childId')
  findByChild(@Param('childId') childId: string, @Request() req: any) {
    const user = getRequestUser(req);
    return this.assessmentsService.findByChildAuthorized(childId, user);
  }

  // GET /assessments/:id — ดูรายละเอียด (แพทย์เจ้าของเคส / ผู้ปกครองของเด็ก)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    const user = getRequestUser(req);
    return this.assessmentsService.findOneAuthorized(id, user);
  }

  // POST /assessments/:id/mock-ai — จำลองผล AI (เฉพาะแพทย์เจ้าของเคส, demo only)
  @Post(':id/mock-ai')
  mockAi(@Param('id') id: string, @Request() req: any) {
    const { userId } = requireDoctor(req);
    return this.assessmentsService.mockAiResult(id, userId);
  }

  // PATCH /assessments/:id/followup — บันทึกวันติดตาม (เฉพาะแพทย์เจ้าของเคส)
  @Patch(':id/followup')
  setFollowup(
    @Param('id') id: string,
    @Body() body: { date: Date; notes?: string },
    @Request() req: any,
  ) {
    const { userId } = requireDoctor(req);
    return this.assessmentsService.setFollowup(id, userId, body.date, body.notes);
  }

  // POST /assessments/:id/notify-parent — แพทย์ส่งผล+วันนัดให้ผู้ปกครอง (เฉพาะแพทย์เจ้าของเคส)
  @Post(':id/notify-parent')
  notifyParent(
    @Param('id') id: string,
    @Body() dto: NotifyParentDto,
    @Request() req: any,
  ) {
    const { userId } = requireDoctor(req);
    return this.assessmentsService.notifyParent(id, userId, dto);
  }
}
