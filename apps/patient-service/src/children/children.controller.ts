import { Controller, Get, Post, Patch, Delete, Param, Body, Request, ForbiddenException } from '@nestjs/common';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';

@Controller('children')
export class ChildrenController {
  constructor(private childrenService: ChildrenService) {}

  // POST /children — แพทย์เพิ่มผู้ป่วยใหม่
  @Post()
  create(@Body() dto: CreateChildDto, @Request() req: any) {
    const doctorId = req.headers['x-user-id'];
    return this.childrenService.create(dto, doctorId);
  }

  // GET /children — แพทย์เห็นผู้ป่วยของตัวเอง / ผู้ปกครองเห็นบุตรหลาน
  @Get()
  findAll(@Request() req: any) {
    const userId = req.headers['x-user-id'];
    const role = req.headers['x-user-role'];
    if (role === 'doctor') return this.childrenService.findByDoctor(userId);
    return this.childrenService.findByParent(userId);
  }

  // GET /children/:id — รายละเอียดเด็ก (ต้องเป็นแพทย์หรือผู้ปกครองของเด็กคนนี้)
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.headers['x-user-id'];
    const role = req.headers['x-user-role'];
    const child = await this.childrenService.findOne(id);
    if (role !== 'doctor' && child.parentId !== userId) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
    }
    return child;
  }

  // PATCH /children/:id — แก้ไขข้อมูลเด็ก (เฉพาะแพทย์เจ้าของเคส)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const userId = req.headers['x-user-id'];
    const role = req.headers['x-user-role'];
    if (role !== 'doctor') throw new ForbiddenException('เฉพาะแพทย์เท่านั้น');
    const child = await this.childrenService.findOne(id);
    if (child.doctorId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์แก้ไขข้อมูลนี้');
    return this.childrenService.update(id, body);
  }

  // DELETE /children/:id — ลบข้อมูลเด็ก (เฉพาะแพทย์เจ้าของเคส)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.headers['x-user-id'];
    const role = req.headers['x-user-role'];
    if (role !== 'doctor') throw new ForbiddenException('เฉพาะแพทย์เท่านั้น');
    const child = await this.childrenService.findOne(id);
    if (child.doctorId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์ลบข้อมูลนี้');
    return this.childrenService.remove(id);
  }
}
