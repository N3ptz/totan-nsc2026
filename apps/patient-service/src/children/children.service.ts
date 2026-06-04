import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Child } from './child.entity';
import { CreateChildDto } from './dto/create-child.dto';

@Injectable()
export class ChildrenService {
  constructor(
    @InjectRepository(Child)
    private childRepo: Repository<Child>,
  ) {}

  async create(dto: CreateChildDto, doctorId: string) {
    const child = this.childRepo.create({ ...dto, doctorId });
    return this.childRepo.save(child);
  }

  findByDoctor(doctorId: string) {
    return this.childRepo.find({
      where: { doctorId },
      order: { createdAt: 'DESC' },
    });
  }

  findByParent(parentId: string) {
    return this.childRepo.find({
      where: { parentId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const child = await this.childRepo.findOne({ where: { id } });
    if (!child) throw new NotFoundException('ไม่พบข้อมูลเด็ก');
    return child;
  }

  async update(id: string, data: Partial<Child>) {
    await this.childRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    const child = await this.findOne(id);
    await this.childRepo.softRemove(child);
    return { message: 'ซ่อนข้อมูลผู้ป่วยสำเร็จ' };
  }
}
