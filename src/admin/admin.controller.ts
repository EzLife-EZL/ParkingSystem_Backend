import {
  Body,
  Controller,
  Param,
  Get,
  Post,
  Put,
  UseGuards,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
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

  @Get('doctors')
  async getDoctors() {
    return this.adminService.getDoctors();
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
}
