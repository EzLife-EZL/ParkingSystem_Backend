import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { FirebaseService } from 'src/firebase/firebase.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, FirebaseService],
})
export class NotificationModule { }
