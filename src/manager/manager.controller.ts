import {
  Body,
  Controller,
  Param,
  Post,
  Get,
  Put,
  Delete,
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

  @Delete('delete-park-by-id/:parkId')
  async deleteParkById(@Param('parkId') parkId: string) {
    return this.managerService.deleteParkById(parkId);
  }

  @Put('update-park-by-id/:parkId')
  async updateParkById(@Param('parkId') parkId: string, @Body() body: any) {
    return this.managerService.updateParkById(parkId, body);
  }

  @Delete('delete-slot-by-id/:parkId/:slotId')
  async deleteSlotbyId(
    @Param('parkId') parkId: string,
    @Param('slotId') slotId: string,
  ) {
    return this.managerService.deleteSlotbyId(parkId, slotId);
  }
}
