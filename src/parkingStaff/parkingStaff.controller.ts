import {
  Controller,
  Body,
  Param,
  Get,
  Put,
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

  @Put('update-slot-status/:parkId/:slotId')
  async updateSlotStatus(
    @Param('parkId') parkId: string,
    @Param('slotId') slotId: string,
    @Body('isBooked') isBooked: boolean,
  ) {
    return this.parkingStaffService.updateSlotStatus(parkId, slotId, isBooked);
  }




}