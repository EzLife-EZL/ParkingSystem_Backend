import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Patch,
  NotFoundException,
  BadRequestException,
  UseGuards,
  Query,
  Put,
  Delete
} from '@nestjs/common';
import { ParkingStaffService } from './parkingStaff.service';

@Controller('parkingStaff')
export class AppointmentController {
  constructor(private readonly parkingStaffService: ParkingStaffService) { }

  @Get('get-pending-reservations')
  async getPendingReservations() {
    return await this.parkingStaffService.getPendingReservations();
  }

  @Put('confirm-reservation/:reservationId')
  async confirmReservation(@Param('reservationId') reservationId: string) {
    return await this.parkingStaffService.confirmReservation(reservationId);
  }

  // // xác nhận nhận xe đã rời bãi
  // @Put('confirm-car-departure/:reservationId')
  // async confirmCarDeparture(@Param('reservationId') reservationId: string) {
  //   return await this.parkingStaffService.confirmCarDeparture(reservationId);
  // }


}