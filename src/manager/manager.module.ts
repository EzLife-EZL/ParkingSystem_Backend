import { Module } from '@nestjs/common';
import { ManagerService } from './manager.service';
import { ManagerController } from './manager.controller';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { CacheService } from 'src/cache.service';
import { FirebaseService } from 'src/firebase/firebase.service';

@Module({
  imports: [
    CloudinaryModule,
  ],
  controllers: [ManagerController],
  providers: [ManagerService, CacheService, FirebaseService],
})
export class ManagerModule { }
