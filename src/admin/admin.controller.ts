import {
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
    const users = await this.adminService.getAllUsers();
    return { users };
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
      @Body() updateData: {
          name?: string,
          phone?: string,
          role?: string,
          email?: string,
          address?: string,
          password?: string
      }
  ) {
      return this.adminService.updateUserInfo(
          userId, 
          updateData.name, 
          updateData.phone, 
          updateData.role,
          updateData.email,
          updateData.address,
          updateData.password
      );
  }
}
