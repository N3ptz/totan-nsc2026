import { Controller, Get, Post, Patch, Delete, Param, Body, Request, ForbiddenException } from '@nestjs/common';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { getRequestUser, requireDoctor } from '../common/request-user';

@Controller('children')
export class ChildrenController {
  constructor(private childrenService: ChildrenService) {}

  // POST /children — แพทย์เพิ่มผู้ป่วยใหม่ (เฉพาะแพทย์)
  @Post()
  create(@Body() dto: CreateChildDto, @Request() req: any) {
    const { userId } = requireDoctor(req);
    return this.childrenService.create(dto, userId);
  }

  // GET /children — แพทย์เห็นผู้ป่วยของตัวเอง / ผู้ปกครองเห็นบุตรหลาน
  @Get()
  findAll(@Request() req: any) {
    const { userId, role } = getRequestUser(req);
    if (role === 'doctor') return this.childrenService.findByDoctor(userId);
    return this.childrenService.findByParent(userId);
  }

  // GET /children/:id — เฉพาะแพทย์เจ้าของเคส หรือผู้ปกครองของเด็กคนนี้
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const { userId, role } = getRequestUser(req);
    const child = await this.childrenService.findOne(id);
    const isOwnerDoctor = role === 'doctor' && child.doctorId === userId;
    const isOwnerParent = child.parentId === userId;
    if (!isOwnerDoctor && !isOwnerParent) {
      throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
    }
    return child;
  }

  // PATCH /children/:id — แก้ไขข้อมูลเด็ก (เฉพาะแพทย์เจ้าของเคส)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const { userId } = requireDoctor(req);
    const child = await this.childrenService.findOne(id);
    if (child.doctorId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์แก้ไขข้อมูลนี้');
    return this.childrenService.update(id, body);
  }

  // DELETE /children/:id — ลบข้อมูลเด็ก (เฉพาะแพทย์เจ้าของเคส)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const { userId } = requireDoctor(req);
    const child = await this.childrenService.findOne(id);
    if (child.doctorId !== userId) throw new ForbiddenException('ไม่มีสิทธิ์ลบข้อมูลนี้');
    return this.childrenService.remove(id);
  }
}
