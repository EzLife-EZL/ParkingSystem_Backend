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

    async getAllBookings() {
        const data = await this.firebaseService.readRecord('bookings');
        if (!data) return [];

        const bookings = Object.entries(data).map(([id, value]: [string, any]) => ({
            id,
            ...value,
        }));

        bookings.sort((a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const enriched = await Promise.all(
            bookings.map(async (booking: any) => {
                const park = await this.firebaseService.readRecord(`park/${booking.parkId}`);
                return {
                    ...booking,
                    parkName: booking.parkName ?? park?.park_name ?? null,
                    address: booking.address ?? park?.address ?? null,
                    type_vehicle: booking.type_vehicle ?? park?.type_vehicle ?? null,
                };
            })
        );

        return enriched;
    }

    async getBookingsByStatus(status: string) {
        const allBookings = await this.getAllBookings();
        return allBookings.filter((booking: any) => booking.status === status);
    }

        async getTodayBookings() {
        const allBookings = await this.getAllBookings();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return allBookings.filter((booking: any) => {
            const bookingDate = new Date(booking.createdAt);
            bookingDate.setHours(0, 0, 0, 0);
            return bookingDate.getTime() === today.getTime();
        });
    }

    async createWalkInBooking(bookingData: {
        parkId: string;
        slotId: string;
        numberPlate: string;
        customerName?: string;
        customerPhone?: string;
        startTime: string;
        endTime: string;
        price: number;
        type_vehicle?: string;
    }) {
        const { parkId, slotId, numberPlate, customerName, customerPhone, startTime, endTime, price, type_vehicle } = bookingData;

        const slotPath = `park/${parkId}/slots/${slotId}`;
        const parkingSlot = await this.firebaseService.readRecord(slotPath);

        if (!parkingSlot) {
            throw new NotFoundException('Parking slot not found');
        }

        if (parkingSlot.isBooked) {
            throw new BadRequestException('Parking slot is already booked');
        }

        const park = await this.firebaseService.readRecord(`park/${parkId}`);

        await this.firebaseService.updateRecord(slotPath, {
            ...parkingSlot,
            isBooked: true,
        });

        const bookingRecord = {
            parkId,
            slotId,
            userId: 'walk-in', 
            numberPlate,
            customerName: customerName ?? '',
            customerPhone: customerPhone ?? '',
            startTime,
            endTime,
            price: price ?? park?.price ?? 0,
            status: 'confirmed',
            slotStatus: 'checked in',
            paymentMethod: 'cash',
            statusPayment: 'unpaid',
            type_vehicle: type_vehicle ?? park?.type_vehicle ?? 'car',

            pos_X: parkingSlot.pos_X,
            pos_Y: parkingSlot.pos_Y,
            slotName: parkingSlot.slotName,

            parkName: park?.park_name ?? '',
            address: park?.address ?? '',

            createdAt: new Date().toISOString(),
            createdBy: 'staff', 
        };

        const newBooking = await this.firebaseService.createRecord('bookings', bookingRecord);

        return {
            message: 'Walk-in booking created successfully',
            booking: newBooking,
        };
    }

    async checkInBooking(bookingId: string) {
        const booking = await this.firebaseService.readRecord(`bookings/${bookingId}`);

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.slotStatus === 'da gui xe') {
            throw new BadRequestException('Vehicle already checked in');
        }

        await this.firebaseService.updateRecord(`bookings/${bookingId}`, {
            slotStatus: 'da gui xe',
            checkedInAt: new Date().toISOString(),
        });

        return {
            message: 'Check-in successful',
            booking: await this.firebaseService.readRecord(`bookings/${bookingId}`),
        };
    }

    async checkOutBooking(bookingId: string) {
        const booking = await this.firebaseService.readRecord(`bookings/${bookingId}`);

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.slotStatus !== 'da gui xe') {
            throw new BadRequestException('Vehicle not checked in yet');
        }

        // Cập nhật slot thành available
        const slotPath = `park/${booking.parkId}/slots/${booking.slotId}`;
        await this.firebaseService.updateRecord(slotPath, {
            isBooked: false,
        });

        // Cập nhật booking
        await this.firebaseService.updateRecord(`bookings/${bookingId}`, {
            status: 'completed',
            slotStatus: 'da lay xe',
            checkedOutAt: new Date().toISOString(),
        });

        return {
            message: 'Check-out successful',
            booking: await this.firebaseService.readRecord(`bookings/${bookingId}`),
        };
    }

    async updatePaymentStatus(bookingId: string, statusPayment: string) {
        const booking = await this.firebaseService.readRecord(`bookings/${bookingId}`);

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        await this.firebaseService.updateRecord(`bookings/${bookingId}`, {
            statusPayment,
            paidAt: statusPayment === 'paid' ? new Date().toISOString() : null,
        });

        return {
            message: 'Payment status updated',
            booking: await this.firebaseService.readRecord(`bookings/${bookingId}`),
        };
    }

    async getAvailableSlots(parkId: string) {
        const parkData = await this.firebaseService.readRecord(`park/${parkId}`);

        if (!parkData || !parkData.slots) {
            return [];
        }

        const slots = Object.entries(parkData.slots).map(([id, value]: [string, any]) => ({
            id,
            ...value,
        }));

        return slots.filter((slot: any) => !slot.isBooked);
    }

    async getTodayStats() {
        const todayBookings = await this.getTodayBookings();

        const stats = {
            totalBookings: todayBookings.length,
            checkedIn: todayBookings.filter((b: any) => b.slotStatus === 'da gui xe').length,
            pending: todayBookings.filter((b: any) => b.status === 'pending').length,
            completed: todayBookings.filter((b: any) => b.status === 'completed').length,
            cancelled: todayBookings.filter((b: any) => b.status === 'cancelled').length,
            totalRevenue: todayBookings
                .filter((b: any) => b.statusPayment === 'paid')
                .reduce((sum: number, b: any) => sum + (b.price || 0), 0),
            unpaidBookings: todayBookings.filter((b: any) => b.statusPayment === 'unpaid').length,
        };

        return stats;
    }
}
