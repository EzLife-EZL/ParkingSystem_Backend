import { Module } from '@nestjs/common';
import { ParkingStaffService } from './parkingStaff.service';
import { AppointmentController } from './parkingStaff.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Doctor, DoctorSchema } from 'src/schemas/doctor.schema';
import { CacheService } from 'src/cache.service';
import { FirebaseService } from 'src/firebase/firebase.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Doctor.name, schema: DoctorSchema },
    ]),
  ],
  controllers: [AppointmentController],
  providers: [ParkingStaffService, CacheService, FirebaseService],
})
export class parkingStaffModule { }
