import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../schemas/user.schema';
import { Doctor } from '../schemas/doctor.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { UpdateFcmDto } from './dto/update-fcm.dto';
import { ReservationDto } from './dto/reservation.dto';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private UserModel: Model<User>,
    @InjectModel(Doctor.name) private DoctorModel: Model<Doctor>,
    private firebaseService: FirebaseService
  ) { }

  async updateFcmToken(userId: string, updateFcmDto: UpdateFcmDto) {
    console.log(updateFcmDto.token);
    if (updateFcmDto.userModel == 'User') {
      return this.UserModel.findByIdAndUpdate(
        userId,
        { fcmToken: updateFcmDto.token },
        { new: true }
      );
    } else if (updateFcmDto.userModel == 'Doctor') {
      return this.DoctorModel.findByIdAndUpdate(
        userId,
        { fcmToken: updateFcmDto.token },
        { new: true }
      );
    }

  }

  async makeReservation(reservation: ReservationDto) {
    const { parkId, slotId } = reservation;

    const slotPath = `park/${parkId}/slots/${slotId}`;
    // 1 get slot info
    const parkingSlot = await this.firebaseService.readRecord(slotPath);
    if (!parkingSlot) {
      throw new NotFoundException('Parking slot not found');
    }

    // 2 check slot status
    if (parkingSlot.isBooked) {
      throw new BadRequestException('Parking slot is already booked');
    }

    // 3 update slot status
    await this.firebaseService.updateRecord(slotPath, {
      ...parkingSlot,
      isBooked: true,
    });

    // 4 create reservation record
    const reservationRecord = await this.firebaseService.createRecord('reservations', {
      ...reservation,
      createdAt: new Date().toISOString(),
    });

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

    console.log(`Found ${availableSlots.length} available slots in park ${parkId}`);
    return availableSlots;
  }

  async getBookingHistory(userId: string) {
    const data = await this.firebaseService.readRecord('reservations');
    if (!data) return [];

    const reservations = Object.values(data);
    const userReservations = reservations.filter(
      (r: any) => r.userId === userId
    );

    userReservations.sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return userReservations;
  }
}

