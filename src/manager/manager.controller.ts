import {
  Body,
  Controller,
  Param,
  Post,
  Get,
  Put,
  Patch,
  UploadedFiles,
} from '@nestjs/common';
import { ManagerService } from './manager.service';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/schemas/user.schema';

import { Express } from 'express';
import { CreateSlotDto } from './dto/createSlot.dto';

@Controller('manager')
export class ManagerController {
  constructor(
    private readonly managerService: ManagerService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) { }

  @Post('create-parking-slot')
  async createParkingSlot(@Body() body: CreateSlotDto) {
    return this.managerService.createParkingSlot(body.path, body);
  }

  @Get('get-all-parking-slots/:pathName')
  async getAllParkingSlots(@Param('pathName') pathName: string) {
    return this.managerService.getAllParkingSlots(pathName);
  }

  @Put(':id/update-profile')
  async updateProfile(
    @Param('id') id: string,
    @UploadedFiles() files: { license?: Express.Multer.File[], image?: Express.Multer.File[], frontCccd?: Express.Multer.File[], backCccd?: Express.Multer.File[] },
    @Body() updateData: any
  ) {
    if (files?.license?.[0]) {
      updateData.license = files.license[0];
    }

    if (files?.image?.[0]) {
      updateData.image = files.image[0];
    }

    if (files?.frontCccd?.[0]) {
      updateData.frontCccd = files.frontCccd[0];
    }

    if (files?.backCccd?.[0]) {
      updateData.backCccd = files.backCccd[0];
    }
    return this.managerService.updateDoctorProfile(id, updateData);
  }

  @Get('doctors')
  async getVerifiedDoctors() {
    return this.managerService.getVerifiedDoctors();
  }

  @Put(':id/fcm-token')
  async updateFcmToken(@Param('id') id: string, @Body('token') token: string) {
    return this.managerService.updateFcmToken(id, token);
  }

}
