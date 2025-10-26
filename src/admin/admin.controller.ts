import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { SignupDto } from 'src/dtos/signup.dto';
import { JwtService } from '@nestjs/jwt';
import { Express } from 'express';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private jwtService: JwtService,
  ) { }

  @Get('getallusers')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Post('postadmin')
  async postAdmin(@Body() signUpData: SignupDto) {
    return this.adminService.postAdmin(signUpData);
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

  @Post('create-admin')
  async createAdmin(@Body() signUpData: SignupDto) {
    return this.adminService.postAdmin(signUpData);
  }

  @Put('update-user-info/:id')
  async updateUserInfo(
    @Param('id') userId: string,
    @Body('name') name: string,
    @Body('phone') phone: string,
    @Body('role') role: string,
  ) {
    return this.adminService.updateUserInfo(userId, name, phone, role);
  }

  @Delete('delete-user/:id')
  async deleteUser(@Param('id') userId: string) {
    return this.adminService.deleteUser(userId);
  }

  @Post('create-parking-staff')
  async createParkingStaff(@Body() signUpData: SignupDto) {
    return this.adminService.createParkingStaff(signUpData);
  }

  @Get('check-booking/:bookingId')
  async checkBooking(@Param('bookingId') bookingId: string) {
    if (!bookingId) throw new BadRequestException('Missing bookingId');
    const exists = await this.adminService.checkBookingInFirestore(bookingId);
    return { exists };
  }
}
