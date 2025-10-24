import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Doctor, DoctorSchema } from 'src/schemas/doctor.schema';
import { FirebaseService } from 'src/firebase/firebase.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Doctor.name, schema: DoctorSchema },
    ])],
  controllers: [UserController],
  providers: [UserService, FirebaseService],
})
export class UserModule { }
