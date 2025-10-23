import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SignupDto } from '../dtos/signup.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CacheService } from 'src/cache.service';
import * as nodemailer from 'nodemailer';
import { google } from 'googleapis';
import e from 'express';
import { LoginGoogleDto } from 'src/dtos/loginGoogle.dto';
import { OAuth2Client } from 'google-auth-library';

import * as admin from 'firebase-admin';
import { FirebaseService } from 'src/firebase/firebase.service';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
@Injectable()
export class AuthService {
  private firebaseAuth: admin.auth.Auth
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private firebaseService: FirebaseService,
  ) {
    this.firebaseAuth = admin.auth();
  }

  async signUp(signUpData: SignupDto) {
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
        role: 'user',
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
        isVerified: false,
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

  async loginWithFirebaseToken(idToken: string) {
    try {
      // Xác minh token do frontend gửi
      const decoded = await this.firebaseAuth.verifyIdToken(idToken);

      const user = await this.firebaseAuth.getUser(decoded.uid);

      // Lấy custom claims
      const customClaims = user.customClaims || {};

      console.log('user uid:', user.uid);
      console.log('user name:', user.displayName);
      console.log('user email:', user.email);
      console.log('custom claims:', customClaims);
      // Tạo JWT riêng
      const accessToken = await this.generateUserTokens(
        user.uid,
        user.email,
        user.displayName || '',
        customClaims.phone || '',
        customClaims.address || '',
        customClaims.role || 'user',
      );

      console.log('Generated access token:', accessToken);

      return {
        message: 'Đăng nhập thành công',
        accessToken,
        firebaseUid: user.uid,
      };
    } catch (error) {
      throw new UnauthorizedException('Token không hợp lệ hoặc hết hạn');
    }
  }

  async signUpAdmin(signUpData: SignupDto) {
    try {
      const { email, password, name, phone } = signUpData;

      const firebaseUser = await this.firebaseAuth.createUser({
        email,
        password,
        displayName: name,
        phoneNumber: phone ? `+84${phone.replace(/^0/, '')}` : undefined,
        emailVerified: true, // Admin tự động verified
      });

      // Set custom claims cho admin
      await this.firebaseAuth.setCustomUserClaims(firebaseUser.uid, {
        role: 'admin',
        name,
        phone,
        address: 'Chưa có địa chỉ',
      });

      return {
        message: 'Tạo tài khoản admin thành công',
        uid: firebaseUser.uid,
      };
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        throw new UnauthorizedException('Email đã được sử dụng');
      }
      throw new InternalServerErrorException(error.message || 'Đã xảy ra lỗi khi đăng ký tài khoản');
    }
  }

  async loginGoogle(LoginData: LoginGoogleDto) {
    const ticket = await client.verifyIdToken({
      idToken: LoginData.idToken,
      audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Không thể xác thực Google');
    }

    const { email, name, picture } = payload;

    let firebaseUser;
    try {
      firebaseUser = await this.firebaseAuth.getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        firebaseUser = await this.firebaseAuth.createUser({
          email,
          displayName: name,
          photoURL: picture,
          emailVerified: true,
        });
        await this.firebaseAuth.setCustomUserClaims(firebaseUser.uid, {
          role: 'user',
        });
      } else throw error;
    }

    const customClaims = firebaseUser.customClaims || {};

    const accessToken = this.jwtService.sign({
      userId: firebaseUser.uid,
      email,
      name,
      role: customClaims.role || 'user',
    });

    return { message: 'Đăng nhập thành công', accessToken };
  }


  async generateUserTokens(userId, email, name, phone, address, role) {
    try {
      const accessToken = this.jwtService.sign({
        userId,
        email,
        name,
        phone,
        address,
        role,
      });
      return accessToken;
    } catch (error) {
      throw new InternalServerErrorException('Không thể tạo token truy cập');
    }
  }

  // async generateGoogleTokens(email: string) {
  //   try {
  //     // Validate email format
  //     if (!email || !email.includes('@')) {
  //       throw new BadRequestException('Email không hợp lệ');
  //     }

  //     const user = await this.findUserByEmail(email);
  //     if (!user) {
  //       throw new UnauthorizedException('Email không tồn tại trong hệ thống');
  //     }

  //     // Ensure all required fields exist
  //     const payload = {
  //       userId: user._id?.toString() || '',
  //       email: user.email || '',
  //       name: user.name || '',
  //       phone: user.phone || '',
  //       address: user.address || '',
  //       role: user.role || 'User', // Default role nếu không có
  //     };

  //     // Log payload for debugging
  //     console.log('JWT Payload:', payload);

  //     const accessToken = this.jwtService.sign(payload, {
  //       expiresIn: '24h', // Thêm thời gian hết hạn
  //     });

  //     // Validate token được tạo
  //     if (!accessToken || typeof accessToken !== 'string') {
  //       throw new InternalServerErrorException('Không thể tạo token hợp lệ');
  //     }

  //     console.log('Generated token:', accessToken);

  //     return {
  //       accessToken
  //     };
  //   } catch (error) {
  //     console.error('Generate token error:', error);
  //     if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
  //       throw error;
  //     }
  //     throw new InternalServerErrorException('Không thể tạo token truy cập', {
  //       cause: error,
  //     });
  //   }
  // }

  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Gửi email trực tiếp trong AuthService
  async sendOTPEmail(to: string, otp: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'hellodoc2000@gmail.com',
        pass: 'upqr lzkh dtft rgfv', // phải là app password
      },
    });

    const mailOptions = {
      from: '"OTP System" <hellodoc2000@gmail.com>',
      to,
      subject: 'Mã OTP xác thực',
      html: `<p>Mã OTP của bạn là: <b>${otp}</b>. Mã có hiệu lực trong 5 phút.</p>`,
    };

    await transporter.sendMail(mailOptions);
  }

  // async requestOtpSignup(email: string): Promise<string> {
  //   const user = await this.findUserByEmail(email);

  //   if (user) {
  //     throw new UnauthorizedException('Email đã tồn tại trong hệ thống');
  //   }

  //   const otp = this.generateOTP();

  //   const cacheKey = `otp:${email}`;
  //   console.log(`Setting cache for key: ${cacheKey}`);
  //   await this.cacheService.setCache(cacheKey, otp, 300 * 1000);

  //   // Gửi email
  //   await this.sendOTPEmail(email, otp);
  //   return otp;
  // }

  // // Đăng nhập (hoặc yêu cầu OTP)
  // async requestOTP(email: string): Promise<string> {
  //   const user = await this.findUserByEmail(email);

  //   if (!user) {
  //     throw new UnauthorizedException('Email không tồn tại trong hệ thống');
  //   }

  //   const otp = this.generateOTP();

  //   const cacheKey = `otp:${email}`;
  //   console.log(`Setting cache for key: ${cacheKey}`);
  //   await this.cacheService.setCache(cacheKey, otp, 300 * 1000);

  //   // Gửi email
  //   await this.sendOTPEmail(email, otp);
  //   return otp;
  // }

  // // Xác minh OTP
  // async verifyOTP(email: string, inputOtp: string): Promise<boolean> {
  //   const cacheKey = `otp:${email}`;
  //   console.log(`Trying to get OTP from cache with key: ${cacheKey}`);

  //   const cachedOtp = await this.cacheService.getCache(cacheKey);
  //   if (!cachedOtp) {
  //     console.log('OTP not found or expired in cache.');
  //     return false;
  //   }

  //   console.log('Cache HIT - Comparing OTPs...');
  //   const isValid = cachedOtp === inputOtp;

  //   if (isValid) {
  //     await this.cacheService.deleteCache(cacheKey); // Xoá cache sau khi xác minh thành công
  //     console.log('OTP verified successfully. Cache cleared.');
  //   } else {
  //     console.log('OTP does not match.');
  //   }

  //   return isValid;
  // }


}
