import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

    async updateSlotStatus(parkId: string, slotId: string, isBooked: boolean) {
        return this.firebaseService.updateRecord(`park/${parkId}/slots/${slotId}`, { isBooked });
    }

    async getTotalBookedSlots(parkId: string) {
        const slotsData = await this.firebaseService.readRecord(`park/${parkId}/slots`);
        if (!slotsData) return 0;
        return Object.values(slotsData).filter((slot: any) => slot.isBooked).length;
    }


}
