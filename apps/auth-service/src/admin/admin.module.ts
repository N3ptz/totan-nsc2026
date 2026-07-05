import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PatientServiceClient } from './patient-service.client';
import { User } from '../users/user.entity';
import { Doctor } from '../users/doctor.entity';
import { Parent } from '../users/parent.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Doctor, Parent])],
  controllers: [AdminController],
  providers: [AdminService, PatientServiceClient],
})
export class AdminModule {}
