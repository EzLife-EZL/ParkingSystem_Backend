import { Module } from '@nestjs/common';
import { ParkingStaffService } from './parkingStaff.service';
import { AppointmentController } from './parkingStaff.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from 'src/schemas/Appointment.schema';
import { User, UserSchema } from 'src/schemas/user.schema';
import { Doctor, DoctorSchema } from 'src/schemas/doctor.schema';
import { CacheService } from 'src/cache.service';
import { Review, ReviewSchema } from 'src/schemas/review.schema';
import { FirebaseService } from 'src/firebase/firebase.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
      { name: User.name, schema: UserSchema },
      { name: Doctor.name, schema: DoctorSchema },
      { name: Review.name, schema: ReviewSchema },
    ]),
  ],
  controllers: [AppointmentController],
  providers: [ParkingStaffService, CacheService, FirebaseService],
})
export class parkingStaffModule { }
