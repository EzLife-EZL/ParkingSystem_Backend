import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';
import { Doctor, DoctorSchema } from 'src/schemas/doctor.schema';
import { Admin, AdminSchema } from 'src/schemas/admin.schema';
import { CacheService } from 'src/cache.service';
import { FirebaseService } from 'src/firebase/firebase.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, CacheService, FirebaseService],
})
export class AuthModule { }
