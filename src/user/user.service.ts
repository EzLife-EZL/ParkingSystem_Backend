import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Doctor } from '../schemas/doctor.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { UpdateFcmDto } from './dto/update-fcm.dto';
import { ReservationDto } from './dto/reservation.dto';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(Doctor.name) private DoctorModel: Model<Doctor>,
    private firebaseService: FirebaseService,
  ) {}

  // async updateFcmToken(userId: string, updateFcmDto: UpdateFcmDto) {
  //   console.log(updateFcmDto.token);
  //   if (updateFcmDto.userModel == 'User') {
  //     return this.UserModel.findByIdAndUpdate(
  //       userId,
  //       { fcmToken: updateFcmDto.token },
  //       { new: true }
  //     );
  //   } else if (updateFcmDto.userModel == 'Doctor') {
  //     return this.DoctorModel.findByIdAndUpdate(
  //       userId,
  //       { fcmToken: updateFcmDto.token },
  //       { new: true }
  //     );
  //   }

  // }

  // src/user/user.service.ts

  async makeReservation(reservation: ReservationDto) {
    const { parkId, slotId } = reservation;
    const slotPath = `park/${parkId}/slots/${slotId}`;

    const parkingSlot = await this.firebaseService.readRecord(slotPath);
    if (!parkingSlot) throw new NotFoundException('Parking slot not found');
    if (parkingSlot.isBooked)
      throw new BadRequestException('Parking slot is already booked');

    // 1) Cập nhật slot
    await this.firebaseService.updateRecord(slotPath, {
      ...parkingSlot,
      isBooked: true,
    });

    // 2) Tạo booking, gán default để tránh undefined
    const raw = {
      parkId: reservation.parkId,
      slotId: reservation.slotId,
      userId: reservation.userId,
      startTime: reservation.startTime,
      endTime: reservation.endTime,

      // 🔴 Các field hay bị undefined -> set default
      status: reservation.status ?? 'pending',
      paymentMethod: reservation.paymentMethod ?? 'cash',
      statusPayment: reservation.statusPayment ?? 'unpaid',
      numberPlate: reservation.numberPlate ?? '',

      // info từ slot
      pos_X: parkingSlot.pos_X,
      pos_Y: parkingSlot.pos_Y,
      slotName: parkingSlot.slotName,

      // chỉ thêm nếu có
      ...(reservation.qrCode !== undefined && { qrCode: reservation.qrCode }),

      createdAt: new Date().toISOString(),
    };

    // 3) Loại bỏ mọi key = undefined
    const reservationData = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== undefined),
    );

    const reservationRecord = await this.firebaseService.createRecord(
      'bookings',
      reservationData,
    );

    return {
      message: 'Reservation successful',
      reservation: reservationRecord,
    };
  }

  async getAvailableParkingSlots(parkId: string) {
    const parkData = await this.firebaseService.readRecord(`park/${parkId}`);

    if (!parkData || !parkData.slots) {
      console.warn(`No slots found for park: ${parkId}`);
      return [];
    }

    // change object to array
    const slots = Object.values(parkData.slots);

    // filter available slots
    const availableSlots = slots.filter((slot: any) => slot.isBooked === false);

    console.log(
      `Found ${availableSlots.length} available slots in park ${parkId}`,
    );
    return availableSlots;
  }

  async getBookingHistory(userId: string) {
    const data = await this.firebaseService.readRecord('bookings');
    if (!data) return [];

    const reservations = Object.values(data);
    const userReservations = reservations.filter(
      (r: any) => r.userId === userId,
    );

    userReservations.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return userReservations;
  }

  async getBookingDetails(bookingId: string) {
    const booking = await this.firebaseService.readRecord(
      `bookings/${bookingId}`,
    );
    return booking;
  }

  async cancelReservation(bookingId: string) {
    const booking = await this.firebaseService.readRecord(
      `bookings/${bookingId}`,
    );

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const slotPath = `park/${booking.parkId}/slots/${booking.slotId}`;
    await this.firebaseService.updateRecord(slotPath, {
      pos_X: booking.pos_X,
      pos_Y: booking.pos_Y,
      slotName: booking.slotName,
      isBooked: false,
    });

    const bookingPath = `bookings/${bookingId}`;
    await this.firebaseService.updateRecord(bookingPath, {
      status: 'cancelled',
      canceledAt: new Date().toISOString(),
    });

    const updatedBooking = await this.firebaseService.readRecord(bookingPath);

    return {
      message: 'Reservation cancelled successfully',
      booking: updatedBooking,
    };
  }
}
