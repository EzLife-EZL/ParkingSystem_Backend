import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CacheService } from 'src/cache.service';
import { Appointment } from 'src/schemas/Appointment.schema';
import { Doctor } from 'src/schemas/doctor.schema';
import { User } from 'src/schemas/user.schema';
import * as admin from 'firebase-admin';
import { Review } from 'src/schemas/review.schema';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class ParkingStaffService {
    constructor(
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

    async updateSlotStatus(parkId: string, slotId: string, status: string) {
        return this.firebaseService.updateRecord(`park/${parkId}/slots/${slotId}`, { status });
    }


}
