import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @Get('get-by-user-id/:userId')
  async getNotificationsByUserId(@Param('userId') userId: string) {
    return this.notificationService.getNotificationsByUserId(userId);
  }

  @Get('get-by-staff-id/:staffId')
  async getNotificationsByStaffId(@Param('staffId') staffId: string) {
    return this.notificationService.getNotificationsByStaffId(staffId);
  }
  // @Patch(':postId/mark-as-read')
  // markAsRead(@Param('postId') postId: string) {
  //   return this.notificationService.markAsRead(postId);
  // }
}
