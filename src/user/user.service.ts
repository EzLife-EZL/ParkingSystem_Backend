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
import * as admin from 'firebase-admin';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(Doctor.name) private DoctorModel: Model<Doctor>,
    private firebaseService: FirebaseService,
  ) {}

  async updateFcmToken(userId: string, token: string) {
    const path = 'staff/' + userId;
    const userDoc = await this.firebaseService.readFirestoreRecord(path);

    console.log('User document:', userDoc);

    // Nếu user chưa có document thì tạo mới
    if (!userDoc) {
      return this.firebaseService.createFirestoreRecord(path, {
        fcmToken: token,
        createdAt: new Date().toISOString(),
      });
    }

    // Nếu đã có thì cập nhật hoặc thêm mới field
    return this.firebaseService.updateFirestoreRecord(path, {
      fcmToken: token,
      updatedAt: new Date().toISOString(),
    });
  }

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
      price: reservation.price ?? 0,

      // Các field hay bị undefined -> set default
      status: reservation.status ?? 'pending',
      slotStatus: reservation.slotStatus ?? 'chua gui xe',
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

    // 4) Thống báo cho staff
    await this.notifyStaff(parkingSlot.staffId, 'You have a new reservation.');

    return {
      message: 'Reservation successful',
      reservation: reservationRecord,
    };
  }

  async notifyStaff(staffId: string, message: string) {
    try {
      const staff: any = await this.firebaseService.readFirestoreRecord(
        'staff/F5x8WZytqxMsVW7MLS404SfDKh12',
      );
      if (!staff) {
        throw new NotFoundException('staff not found');
      }

      if (staff?.fcmToken) {
        await admin.messaging().send({
          token: staff.fcmToken,
          notification: {
            title: 'GoPark Notification',
            body: message,
          },
        });

        const staffId2 = 'F5x8WZytqxMsVW7MLS404SfDKh12';

        await this.firebaseService.createRecord('notifications', {
          staffId: staffId2,
          message: message,
          createdAt: new Date().toISOString(),
        });
        console.log(`Đã gửi thông báo đến staff F5x8WZytqxMsVW7MLS404SfDKh12`);
      } else {
        console.warn(`staff F5x8WZytqxMsVW7MLS404SfDKh12 không có fcmToken`);
      }
    } catch (error) {
      console.error('Error notifying staff:', error);
      throw new BadRequestException('Failed to notify staff');
    }
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
    const reservations = Object.entries(data).map(
      ([id, value]: [string, any]) => ({
        id,
        ...value,
      }),
    );

    const userReservations = reservations.filter(
      (r: any) => r.userId === userId,
    );

    userReservations.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const enriched = await Promise.all(
      userReservations.map(async (booking: any) => {
        const park = await this.firebaseService.readRecord(
          `park/${booking.parkId}`,
        );

        return {
          ...booking,
          parkName: booking.parkName ?? park?.park_name ?? null,
          address: booking.address ?? park?.address ?? null,
          type_vehicle: booking.type_vehicle ?? park?.type_vehicle ?? null,
          price: booking.price ?? park?.price ?? null,
        };
      }),
    );

    return enriched;
  }

  async getBookingDetails(bookingId: string) {
    const booking: any = await this.firebaseService.readRecord(
      `bookings/${bookingId}`,
    );

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const parkData = await this.firebaseService.readRecord(
      `park/${booking.parkId}`,
    );
    const enriched = {
      ...booking,
      parkName: booking.parkName ?? parkData?.park_name ?? '',
      address: booking.address ?? parkData?.address ?? '',
      type_vehicle: booking.type_vehicle ?? parkData?.type_vehicle ?? '',
      price: booking.price ?? parkData?.price ?? 0,
    };

    return enriched;
  }

  async cancelReservation(bookingId: string) {
    const booking = await this.firebaseService.readRecord(
      `bookings/${bookingId}`,
    );

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const park = await this.firebaseService.readRecord(
      `park/${booking.parkId}`,
    );

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
      id: bookingId,
      ...booking,
      parkName: booking.parkName ?? park?.park_name ?? null,
      address: booking.address ?? park?.address ?? null,
      type_vehicle: booking.type_vehicle ?? park?.type_vehicle ?? null,
      price: booking.price ?? park?.price ?? null,
      booking: updatedBooking,
    };
  }
}
