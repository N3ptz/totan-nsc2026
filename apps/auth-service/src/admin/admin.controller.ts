import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// ทุก route ในนี้เฉพาะ admin เท่านั้น — แสดงผลอย่างเดียว ไม่มี edit/delete/suspend
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // GET /admin/stats
  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // GET /admin/doctors
  @Get('doctors')
  listDoctors() {
    return this.adminService.listDoctors();
  }

  // GET /admin/parents
  @Get('parents')
  listParents() {
    return this.adminService.listParents();
  }

  // GET /admin/scans
  @Get('scans')
  listScans() {
    return this.adminService.listScans();
  }
}
