import {
  BadRequestException,
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

@Injectable()
export class AdminService {
  private firestore: admin.firestore.Firestore;
  private usersCollection: FirebaseFirestore.CollectionReference;

  constructor(
    @InjectModel(Admin.name) private AdminModel: Model<Admin>,
    @InjectModel(Doctor.name) private DoctorModel: Model<Doctor>,
    private cloudinaryService: CloudinaryService,
    private jwtService: JwtService,

  ) {
    this.firestore = admin.firestore(),
      this.usersCollection = this.firestore.collection('users')
  }

  async getAllUsers() {
    const snapshot = await this.usersCollection.get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return users;
  }

  async getDoctors() {
    return await this.DoctorModel.find();
  }

  async postAdmin(signUpData: SignupDto) {
    const { email, password, name, phone } = signUpData;

    const emailInUse = await this.AdminModel.findOne({ email });
    if (emailInUse) {
      throw new BadRequestException('Email already in use');
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    await this.AdminModel.create({
      email,
      password: hashedPassword,
      name,
      phone,
    });

    return { message: 'Admin created successfully' };
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
}
