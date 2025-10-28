import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class NotificationService {
  constructor(
    private firebaseService: FirebaseService,
  ) { }


  async getNotificationsByUserId(userId: string) {
    //Lấy notifications từ Firebase theo mới nhất về cũ nhất
    const notificationsData = await this.firebaseService.readRecord('notifications');
    const notificationsArray = notificationsData ? Object.values(notificationsData) : [];
    const userNotifications = notificationsArray
      .filter((notification: any) => notification.userId === userId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return userNotifications;
  }

  async getNotificationsByStaffId(staffId: string) {
    const notifications = await this.firebaseService.readRecord('notifications');

    //console.log('notifications:', notifications);

    // Convert the object to an array of values
    const notificationsArray = notifications ? Object.values(notifications) : [];

    const staffNotifications = notificationsArray.filter(
      (notification: any) => notification.staffId === staffId
    );

    return staffNotifications;
  }


  // async markAsRead(notificationId: string): Promise<Notification> {
  //   try {
  //     const updatedNotification = await this.notificationModel.findByIdAndUpdate(
  //       notificationId,
  //       { isRead: true },
  //       { new: true },
  //     );

  //     if (!updatedNotification) {
  //       throw new NotFoundException('Không tìm thấy thông báo');
  //     }

  //     return updatedNotification;
  //   } catch (error) {
  //     console.error('Lỗi khi đánh dấu thông báo đã đọc:', error);
  //     throw new InternalServerErrorException('Đã xảy ra lỗi khi đánh dấu thông báo đã đọc');
  //   }
  // }

}
