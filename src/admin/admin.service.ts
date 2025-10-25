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
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id, 
        ...doc.data(),
        createdAt: data.createdAt?.toDate().toISOString() || null,
        updatedAt: data.updatedAt?.toDate().toISOString() || null,
      };
    });
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
      await this.firebaseService.createFirestoreRecord(`users/${user.uid}`, {
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
    email?: string,
    address?: string,
    password?: string
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


}
