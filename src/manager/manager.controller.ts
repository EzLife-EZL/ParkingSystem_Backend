import {
  Body,
  Controller,
  Param,
  Post,
  Get,
  Put,
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

  @Get('get-park-by-id/:parkId')
  async getParkById(@Param('parkId') parkId: string) {
    return this.managerService.getParkById(parkId);
  }
}
