import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CacheService } from 'src/cache.service';
import { BookAppointmentDto } from 'src/dtos/appointment.dto';
import { Appointment, AppointmentStatus, ExaminationMethod } from 'src/schemas/Appointment.schema';
import { Doctor } from 'src/schemas/doctor.schema';
import { User } from 'src/schemas/user.schema';
import * as admin from 'firebase-admin';
import { Review } from 'src/schemas/review.schema';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class ParkingStaffService {
    constructor(
        @InjectModel(Appointment.name) private appointmentModel: Model<Appointment>,
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Doctor.name) private doctorModel: Model<Doctor>,
        @InjectModel(Review.name) private reviewModel: Model<Review>,
        private cacheService: CacheService,
        private firebaseService: FirebaseService,
    ) { }

    async getPendingReservations() {
        return await this.firebaseService.readRecord('pending-reservations');
    }

    async confirmReservation(reservationId: string) {
        const data = await this.getPendingReservations();

        if (!data) return [];
        const reservations = Object.values(data);

        const reservation = reservations.find((reservation: any) => reservation.id === reservationId);

        if (!reservation) {
            throw new NotFoundException('Reservation not found');
        }

        (reservation as any).status = 'not available';

        return this.firebaseService.updateRecord('pending-reservations', reservation as any);

    }



}
