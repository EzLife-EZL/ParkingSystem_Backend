import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Admin } from 'src/schemas/admin.schema';
import { SignupDto } from '../dtos/signup.dto';
import * as bcrypt from 'bcrypt';
import { Model, isValidObjectId, Types } from 'mongoose';
import { Doctor } from 'src/schemas/doctor.schema';
import { JwtService } from '@nestjs/jwt';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import * as admin from 'firebase-admin';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class AdminService {
  private firebaseAuth: admin.auth.Auth
  private firestore: admin.firestore.Firestore;
  private usersCollection: FirebaseFirestore.CollectionReference;

  constructor(
    private cloudinaryService: CloudinaryService,
    private jwtService: JwtService,
    private firebaseService: FirebaseService,
  ) {
    this.firestore = admin.firestore(),
      this.firebaseAuth = admin.auth();
    this.usersCollection = this.firestore.collection('users')
  }

  async getAllUsers() {
    const snapshot = await this.usersCollection.get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return users;
  }

  async postAdmin(signUpData: SignupDto) {
    const { email, password, name, phone } = signUpData;
    try {
      // check if email already exists
      try {
        await this.firebaseAuth.getUserByEmail(email);
        throw new UnauthorizedException('Email đã được sử dụng');
      } catch (error) {
        if (error.code !== 'auth/user-not-found') throw error;
      }

      // create user in firebase auth
      const user = await this.firebaseAuth.createUser({
        email,
        password,
        displayName: name,
        phoneNumber: phone ? `+84${phone.replace(/^0/, '')}` : undefined,
      });

      // Custom claims
      await this.firebaseAuth.setCustomUserClaims(user.uid, {
        role: 'Admin',
        name,
        phone,
        address: 'Chưa có địa chỉ',
      });

      // save to firestore
      await this.firebaseService.createFirestoreRecord(`admin/${user.uid}`, {
        uid: user.uid,
        email,
        name,
        phone: phone ? `+84${phone.replace(/^0/, '')}` : null,
        role: 'Admin',
        address: 'Chưa có địa chỉ',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // generate email verification link
      const verifyLink = await this.firebaseAuth.generateEmailVerificationLink(email);

      return {
        message: 'Đăng ký thành công',
        uid: user.uid,
        verifyLink,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async generateAdminTokens(userId, email, name, role) {
    const accessToken = this.jwtService.sign(
      { userId, email, name, role },
      { expiresIn: '1d' },
    );
    return {
      accessToken,
    };
  }

  async updateUserInfo(
    userId: string,
    name?: string,
    phone?: string,
    role?: string,
  ) {
    try {
      const userRecord = await this.firebaseAuth.getUser(userId);
      if (!userRecord) {
        throw new NotFoundException('Người dùng không tồn tại');
      }

      // Lấy thông tin hiện tại từ Firestore
      const currentUserData = await this.firebaseService.readFirestoreRecord(`users/${userId}`);

      // Chuẩn bị dữ liệu cập nhật cho Firebase Auth
      const authUpdateData: any = {};
      if (name !== undefined) {
        authUpdateData.displayName = name;
      }
      if (phone !== undefined && phone !== null && phone !== '') {
        authUpdateData.phoneNumber = `+84${phone.replace(/^0/, '')}`;
      }

      // Chỉ cập nhật Firebase Auth nếu có dữ liệu thay đổi
      if (Object.keys(authUpdateData).length > 0) {
        await this.firebaseAuth.updateUser(userId, authUpdateData);
      }

      if (role !== undefined) {
        const currentClaims = userRecord.customClaims || {};
        await this.firebaseAuth.setCustomUserClaims(userId, {
          ...currentClaims,
          role: role,
        });
      }

      // Chuẩn bị dữ liệu cập nhật cho Firestore
      const firestoreUpdateData: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (name !== undefined) {
        firestoreUpdateData.name = name;
      }
      if (phone !== undefined) {
        firestoreUpdateData.phone = phone ? `+84${phone.replace(/^0/, '')}` : null;
      }
      if (role !== undefined) {
        firestoreUpdateData.role = role;
      }

      await this.firebaseService.updateFirestoreRecord(
        `users/${userId}`,
        firestoreUpdateData,
      );

      return {
        message: 'Cập nhật thông tin người dùng thành công',
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async deleteUser(userId: string) {
    try {
      const userRecord = await this.firebaseAuth.getUser(userId);
      if (!userRecord) {
        throw new NotFoundException('Người dùng không tồn tại');
      }
      await this.firebaseAuth.deleteUser(userId);
      await this.firebaseService.deleteFirestoreRecord(`users/${userId}`);
      return {
        message: 'Xoa người dùng thanh cong',
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async createParkingStaff(signUpData: SignupDto) {
    return this.signUpAccoutForParkingStaff(signUpData);
  }

  async signUpAccoutForParkingStaff(signUpData: SignupDto) {
    const { email, password, name, phone } = signUpData;
    try {
      // check if email already exists
      try {
        await this.firebaseAuth.getUserByEmail(email);
        throw new UnauthorizedException('Email đã được sử dụng');
      } catch (error) {
        if (error.code !== 'auth/user-not-found') throw error;
      }

      // create user in firebase auth
      const user = await this.firebaseAuth.createUser({
        email,
        password,
        displayName: name,
        phoneNumber: phone ? `+84${phone.replace(/^0/, '')}` : undefined,
      });

      // Custom claims
      await this.firebaseAuth.setCustomUserClaims(user.uid, {
        role: 'Staff',
        name,
        phone,
        address: 'Chưa có địa chỉ',
      });

      // save to firestore
      await this.firebaseService.createFirestoreRecord(`staff/${user.uid}`, {
        uid: user.uid,
        email,
        name,
        phone: phone ? `+84${phone.replace(/^0/, '')}` : null,
        role: 'Staff',
        address: 'Chưa có địa chỉ',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // generate email verification link
      const verifyLink = await this.firebaseAuth.generateEmailVerificationLink(email);

      return {
        message: 'Đăng ký thành công',
        uid: user.uid,
        verifyLink,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async checkBookingInFirestore(bookingId: string) {
    try {
      const path = `bookings/${bookingId}`;
      const booking = await this.firebaseService.readRecord(path);

      if (!booking) {
        return { success: false, message: 'Booking not found' };
      }

      const slotId = booking.slotId;

      let updateData: any = {};
      const now = new Date().toISOString();
      let notifyMessage = '';

      // check slotStatus and update accordingly
      if (booking.slotStatus === 'chua gui xe') {
        updateData = {
          slotStatus: 'da gui xe',
          checkInTime: now,
        };
        notifyMessage = `Your vehicle has been checked in at ${new Date(now).toLocaleTimeString()}`;
      } else if (booking.slotStatus === 'da gui xe') {
        updateData = {
          slotStatus: 'da hoan thanh',
          status: 'done',
          statusPayment: 'paid',
          checkOutTime: now,
        };
        notifyMessage = `Your vehicle has been checked out at ${new Date(now).toLocaleTimeString()}`;

        // update slot to be available
        if (booking.parkId && slotId !== undefined) {
          const slotPath = `park/${booking.parkId}/slots/${slotId}`;
          await this.firebaseService.updateRecord(slotPath, { isBooked: false });
        }
      } else if (booking.slotStatus === 'da hoan thanh') {
        return {
          success: true,
          message: 'Booking already completed',
          booking,
        };
      } else {
        return {
          success: false,
          message: `Status is not valid: ${booking.status}`,
        };
      }

      await this.firebaseService.updateRecord(path, updateData);

      if (booking.userId) {
        await this.notifyUser(booking.userId, bookingId, notifyMessage);
      }
      if (booking.staffId) {
        await this.notifyStaff(booking.staffId, booking.parkId, `Booking ${bookingId} was updated to "${updateData.slotStatus}"`);
      } else {

        await this.notifyStaff('F5x8WZytqxMsVW7MLS404SfDKh12', booking.parkId, `Booking ${bookingId} was updated to "${updateData.slotStatus}"`);
      }
      return {
        success: true,
        message: `Booking status updated: ${updateData.status}`,
        updatedAt: now,
      };
    } catch (error) {
      console.error('Error checking/updating booking:', error);
      return { success: false, message: 'Lỗi xử lý booking' };
    }
  }

  async notifyUser(userId: string, reservationId: string, message: string) {
    try {
      const user: any = await this.firebaseService.readFirestoreRecord(
        'users/' + userId,
      );
      if (!user) {
        throw new NotFoundException('user not found');
      }

      if (user?.fcmToken) {
        await admin.messaging().send({
          token: user.fcmToken,
          notification: {
            title: 'GoPark Notification',
            body: message,
          },
        });

        await this.firebaseService.createRecord('notifications', {
          userId: userId,
          message: message,
          navPath: `booking_detail/${reservationId}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
        console.log(`Đã gửi thông báo đến user ${userId}`);
      } else {
        console.log(`Fcm token of user ${userId} not found, skip sending notification`);
      }
    } catch (error) {
      console.error('Error notifying user:', error);
      throw new BadRequestException('Failed to notify user');
    }
  }

  async notifyStaff(staffId: string, parkId: string, message: string) {
    try {
      const staff: any = await this.firebaseService.readFirestoreRecord(
        'staff/F5x8WZytqxMsVW7MLS404SfDKh12',
      );
      if (!staff) {
        throw new NotFoundException('staff not found');
      }

      if (staff?.fcmToken) {
        await admin.messaging().send({
          token: staff.fcmToken,
          notification: {
            title: 'GoPark Notification',
            body: message,
          },
        });

        const staffId2 = 'F5x8WZytqxMsVW7MLS404SfDKh12';

        await this.firebaseService.createRecord('notifications', {
          staffId: staffId2,
          message: message,
          navPath: `park/${parkId}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
        console.log(`Đã gửi thông báo đến staff F5x8WZytqxMsVW7MLS404SfDKh12`);
      } else {
        console.warn(`staff F5x8WZytqxMsVW7MLS404SfDKh12 không có fcmToken`);
      }
    } catch (error) {
      console.error('Error notifying staff:', error);
      throw new BadRequestException('Failed to notify staff');
    }
  }

}
