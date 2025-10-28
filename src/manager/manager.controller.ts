import {
  Body,
  Controller,
  Param,
  Post,
  Get,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { ManagerService } from './manager.service';

import { Express } from 'express';
import { CreateSlotDto } from './dto/createSlot.dto';
import { SignupDto } from 'src/dtos/signup.dto';

@Controller('manager')
export class ManagerController {
  constructor(
    private readonly managerService: ManagerService,
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

  @Post('parking-staff')
  async createParkingStaff(@Body() body: SignupDto) {
    return this.managerService.createParkingStaff(body);
  }

  @Get('revenue-report')
  async getRevenueReport(@Query('period') period?: string) {
    return this.managerService.getRevenueReport(period || 'month');
  }
}
