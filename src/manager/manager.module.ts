import { Module } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { ManagerController } from './manager.controller';
import { Doctor, DoctorSchema } from 'src/schemas/doctor.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { CacheModule } from '@nestjs/cache-manager';
import { CacheService } from 'src/cache.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { Specialty, SpecialtySchema } from 'src/schemas/specialty.schema';
import { PendingDoctor, PendingDoctorSchema } from 'src/schemas/PendingDoctor.shema';
import { Appointment, AppointmentSchema } from 'src/schemas/Appointment.schema';

@Module({
  imports: [
    CloudinaryModule,
    MongooseModule.forFeature([
      { name: Doctor.name, schema: DoctorSchema },
      { name: User.name, schema: UserSchema },
      { name: Specialty.name, schema: SpecialtySchema },
      { name: PendingDoctor.name, schema: PendingDoctorSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    CacheModule.register(),
  ],
  controllers: [ManagerController],
  providers: [ManagerService, CacheService, FirebaseService],
})
export class ManagerModule { }
