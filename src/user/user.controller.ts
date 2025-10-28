import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateFcmDto } from './dto/update-fcm.dto';
import { ReservationDto } from './dto/reservation.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Put(':id/fcm-token')
  async updateFcmToken(@Param('id') id: string, @Body() body: { token: string }) {
    return this.userService.updateFcmToken(id, body.token);
  }

  @Post('make-reservation')
  async makeReservation(@Body() reservationDto: ReservationDto) {
    return this.userService.makeReservation(reservationDto);
  }

  @Get('get-all-parking-slots/available/:pathName')
  async getAvailableParkingSlots(@Param('pathName') pathName: string) {
    return this.userService.getAvailableParkingSlots(pathName);
  }

  @Get('view-booking-history/:userId')
  async getBookingHistory(@Param('userId') userId: string) {
    return this.userService.getBookingHistory(userId);
  }

  @Get('booking/details/api/:bookingId')
  async getBookingDetails(@Param('bookingId') bookingId: string) {
    return this.userService.getBookingDetails(bookingId);
  }

  @Post('cancel-reservation/:bookingId')
  async cancelReservation(@Param('bookingId') bookingId: string) {
    return this.userService.cancelReservation(bookingId);
  }

  @Put('update-profile/:userId')
  async updateProfile(@Param('userId') userId: string, @Body() body: any) {
    return this.userService.updateProfile(userId, body);
  }


}
