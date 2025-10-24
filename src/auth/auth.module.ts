import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CacheService } from 'src/cache.service';
import { FirebaseService } from 'src/firebase/firebase.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, CacheService, FirebaseService],
})
export class AuthModule { }
