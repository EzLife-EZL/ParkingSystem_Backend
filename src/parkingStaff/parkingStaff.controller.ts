import {
  Controller,
  Body,
  Param,
  Get,
  Put,
  Post
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

  @Get('bookings')
  async getAllBookings() {
    return await this.parkingStaffService.getAllBookings();
  }

  @Get('bookings/status/:status')
  async getBookingsByStatus(@Param('status') status: string) {
    return await this.parkingStaffService.getBookingsByStatus(status);
  }

  @Get('bookings/today')
  async getTodayBookings() {
    return await this.parkingStaffService.getTodayBookings();
  }

  @Get('total-booked-slots/:parkId')
  async getTotalBookedSlots(@Param('parkId') parkId: string) {
    return this.parkingStaffService.getTotalBookedSlots(parkId);
  }

  @Post('bookings/walk-in')
  async createWalkInBooking(
    @Body() bookingData: {
      parkId: string;
      slotId: string;
      numberPlate: string;
      customerName?: string;
      customerPhone?: string;
      startTime: string;
      endTime: string;
      price: number;
      type_vehicle?: string;
    }
  ) {
    return await this.parkingStaffService.createWalkInBooking(bookingData);
  }

  @Put('bookings/:bookingId/check-in')
  async checkInBooking(@Param('bookingId') bookingId: string) {
    return await this.parkingStaffService.checkInBooking(bookingId);
  }
  //update payment status
  @Put('bookings/:bookingId/payment')
  async updatePaymentStatus(
    @Param('bookingId') bookingId: string,
    @Body('statusPayment') statusPayment: string
  ) {
    return await this.parkingStaffService.updatePaymentStatus(bookingId, statusPayment);
  }

  @Get('parks/:parkId/available-slots')
  async getAvailableSlots(@Param('parkId') parkId: string) {
    return await this.parkingStaffService.getAvailableSlots(parkId);
  }

  @Get('stats/today')
  async getTodayStats() {
    return await this.parkingStaffService.getTodayStats();
  }
}