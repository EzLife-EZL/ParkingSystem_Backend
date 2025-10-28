import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Express } from 'express';
import { CreateSlotDto } from './dto/createSlot.dto';
import { FirebaseService } from 'src/firebase/firebase.service';
import { SignupDto } from 'src/dtos/signup.dto';
import * as admin from 'firebase-admin';

@Injectable()
export class ManagerService {
  private firebaseAuth: admin.auth.Auth;
  constructor(private firebaseService: FirebaseService) {
    this.firebaseAuth = admin.auth();
  }

  async createParkingSlot(path: string, body: CreateSlotDto) {
    const parkData = body.data;
    const { park_name, slots } = parkData;

    const existingParks = await this.firebaseService.readRecord(path);
    const parkKey = Object.keys(existingParks || {}).find(
      (key) => existingParks[key].park_name === park_name,
    );

    if (parkKey) {
      const existingSlotsData =
        (await this.firebaseService.readRecord(`${path}/${parkKey}/slots`)) ||
        {};

      const existingSlotNames = Object.values(existingSlotsData).map(
        (s: any) => s.slotName,
      );

      const duplicateSlots = slots.filter((s) =>
        existingSlotNames.includes(s.slotName),
      );

      if (duplicateSlots.length > 0) {
        throw new Error(
          `Các slot bị trùng tên: ${duplicateSlots.map((s) => s.slotName).join(', ')}.`,
        );
      }

      // Tạo slotId tự động bằng Firebase push()
      const createdSlots: any[] = [];
      for (const slot of slots) {
        if (
          slot &&
          slot.slotName &&
          slot.pos_X &&
          slot.pos_Y &&
          typeof slot.isBooked === 'boolean'
        ) {
          const newSlot = await this.firebaseService.createRecord(
            `${path}/${parkKey}/slots`,
            slot,
          );
          createdSlots.push(newSlot);
        }
      }

      return {
        message: `Đã thêm ${createdSlots.length} slot mới vào ${park_name}.`,
        parkId: parkKey,
        newSlots: createdSlots,
      };
    } else {
      // Nếu bãi chưa tồn tại → tạo bãi mới trước
      const newPark = await this.firebaseService.createRecord(path, {
        ...parkData,
        slots: {},
      });

      // Sau đó thêm slot vào bãi vừa tạo
      const createdSlots: any[] = [];
      for (const slot of slots) {
        const newSlot = await this.firebaseService.createRecord(
          `${path}/${newPark.id}/slots`,
          slot,
        );
        createdSlots.push(newSlot);
      }

      return {
        message: `Tạo mới bãi xe ${park_name} thành công và thêm ${createdSlots.length} slot.`,
        parkId: newPark.id,
        newSlots: createdSlots,
      };
    }
  }

  // Service
  async getAllParkingSlots(pathName: string) {
    const data = await this.firebaseService.readRecord(pathName);

    if (!data || typeof data !== 'object') {
      return [];
    }

    // format data
    const result = Object.entries(data).map(
      ([parkId, parkData]: [string, any]) => {
        return {
          park_id: parkId,
          park_name: parkData.park_name || '',
          address: parkData.address || '',
          price: parkData.price || 0,
          type_vehicle: parkData.type_vehicle || '',
          slots: parkData.slots
            ? Object.entries(parkData.slots).map(
              ([slotId, slotData]: [string, any]) => {
                return {
                  slot_id: slotId,
                  slot_name: slotData.slot_name || '',
                  pos_X: slotData.pos_x || 0,
                  pos_Y: slotData.pos_y || 0,
                  status: slotData.status || 'AVAILABLE',
                  spotNumber: slotData.spot_number || '',
                  ...slotData, // keep other fields if any
                };
              },
            )
            : [],
        };
      },
    );

    return result;
  }

  async getParkById(parkId: string) {
    const parkData = await this.firebaseService.readRecord(`park/${parkId}`);

    // if park not found
    if (!parkData || typeof parkData !== 'object') {
      return null;
    }

    // format data
    const result = {
      park_id: parkId,
      park_name: parkData.park_name || '',
      address: parkData.address || '',
      price: parkData.price || 0,
      type_vehicle: parkData.type_vehicle || '',
      slots: parkData.slots
        ? Object.entries(parkData.slots).map(
          ([slotId, slotData]: [string, any]) => {
            return {
              slot_id: slotId,
              pos_X: slotData.pos_x || 0,
              pos_Y: slotData.pos_y || 0,
              status: slotData.status || 'AVAILABLE',
              spotNumber: slotData.spot_number || '',
              slot_name: slotData.slot_name || '',
              ...slotData, // keep other fields if any
            };
          },
        )
        : [],
    };

    return result;
  }
  async deleteParkById(parkId: string) {
    return this.firebaseService.deleteRecord(`park/${parkId}`);
  }

  async updateParkById(parkId: string, body: any) {
    return this.firebaseService.updateRecord(`park/${parkId}`, body);
  }

  async deleteSlotbyId(parkId: string, slotId: string) {
    return this.firebaseService.deleteRecord(`park/${parkId}/slots/${slotId}`);
  }

  async updateSlotDetails(parkId: string, slotId: string, body: any) {
    return this.firebaseService.updateRecord(
      `park/${parkId}/slots/${slotId}`,
      body,
    );
  }

  async createParkingStaff(body: SignupDto) {
    return this.signUpAccoutForParkingStaff(body);
  }

  async signUpAccoutForParkingStaff(signUpData: SignupDto) {
    const { email, password, name, phone } = signUpData;
    try {
      // check if email already exists
      try {
        await this.firebaseAuth.getUserByEmail(email);
        throw new UnauthorizedException('Email đã được sử dụng');
      } catch (error) {
        if (error.code !== 'auth/user-not-found') throw error;
      }

      // create user in firebase auth
      const user = await this.firebaseAuth.createUser({
        email,
        password,
        displayName: name,
        phoneNumber: phone ? `+84${phone.replace(/^0/, '')}` : undefined,
      });

      // Custom claims
      await this.firebaseAuth.setCustomUserClaims(user.uid, {
        role: 'ParkingStaff',
        name,
        phone,
        address: 'Chưa có địa chỉ',
      });

      // save to firestore
      await this.firebaseService.createFirestoreRecord(`users/${user.uid}`, {
        uid: user.uid,
        email,
        name,
        phone: phone ? `+84${phone.replace(/^0/, '')}` : null,
        role: 'ParkingStaff',
        address: 'Chưa có địa chỉ',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // generate email verification link
      const verifyLink =
        await this.firebaseAuth.generateEmailVerificationLink(email);

      return {
        message: 'Đăng ký thành công',
        uid: user.uid,
        verifyLink,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getParkingOverview() {
    try {
      const now = new Date();
      
      const allParks = await this.firebaseService.readRecord('park');
      
      const allBookings = await this.firebaseService.readRecord('bookings');

      if (!allParks || typeof allParks !== 'object') {
        return {
          parkedVehicles: 0,
          availableSpots: 0,
          totalSpots: 0,
          occupancyRate: 0,
        };
      }

      let totalSlots = 0;
      let occupiedSlots = 0;

      const currentlyOccupiedSlotIds = new Set<string>();

      if (allBookings && typeof allBookings === 'object') {
        Object.values(allBookings).forEach((booking: any) => {
          if (booking.slotStatus === 'chua gui xe' || booking.status === 'da gui xe') {
            if (booking.slotId) {
              currentlyOccupiedSlotIds.add(booking.slotId);
            }
          }
        });
      }

      Object.values(allParks).forEach((park: any) => {
        if (park.slots && typeof park.slots === 'object') {
          Object.entries(park.slots).forEach(([slotId, slot]: [string, any]) => {
            totalSlots++;
            
            if (currentlyOccupiedSlotIds.has(slotId)) {
              occupiedSlots++;
            }
          });
        }
      });

      const availableSlots = totalSlots - occupiedSlots;
      const occupancyRate = totalSlots > 0 
        ? parseFloat(((occupiedSlots / totalSlots) * 100).toFixed(2))
        : 0;

      return {
        parkedVehicles: occupiedSlots,
        availableSpots: availableSlots,
        totalSpots: totalSlots,
        occupancyRate: occupancyRate,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Lỗi khi lấy thông tin tổng quan: ${error.message}`,
      );
    }
  }

  async getRevenueReport(period: string) {
    try {
      const now = new Date();
      let currentPeriodStart: Date;
      let currentPeriodEnd: Date;
      let previousPeriodStart: Date;
      let previousPeriodEnd: Date;
      let currentLabel: string;
      let previousLabel: string;

      switch (period.toLowerCase()) {
        case 'day':
          currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          currentPeriodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

          previousPeriodStart = new Date(currentPeriodStart);
          previousPeriodStart.setDate(previousPeriodStart.getDate() - 1);
          previousPeriodEnd = new Date(currentPeriodEnd);
          previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);

          currentLabel = 'Today';
          previousLabel = 'Yesterday';
          break;

        case 'year':
          currentPeriodStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
          currentPeriodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

          previousPeriodStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0);
          previousPeriodEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);

          currentLabel = 'This Year';
          previousLabel = 'Last Year';
          break;

        case 'month':
        default:
          currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
          currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

          previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
          previousPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

          currentLabel = 'This Month';
          previousLabel = 'Last Month';
          break;
      }

      console.log('=== DEBUG REVENUE REPORT ===');
      console.log('Period:', period);
      console.log('Current Period:', currentPeriodStart, 'to', currentPeriodEnd);

      const allBookings = await this.firebaseService.readRecord('bookings');

      // Kiểm tra data structure
      console.log('\n=== FIREBASE DATA DEBUG ===');
      console.log('Type of allBookings:', typeof allBookings);
      console.log('Is array?', Array.isArray(allBookings));
      console.log('allBookings:', JSON.stringify(allBookings, null, 2));

      if (allBookings) {
        console.log('Keys:', Object.keys(allBookings));
        console.log('Number of keys:', Object.keys(allBookings).length);
      }

      let currentRevenue = 0;
      let previousRevenue = 0;
      let totalBookings = 0;
      let paidBookings = 0;

      if (allBookings && typeof allBookings === 'object') {
        const bookingEntries = Object.entries(allBookings);
        console.log('\n=== Processing bookings ===');
        console.log('Total entries:', bookingEntries.length);

        bookingEntries.forEach(([key, booking]: [string, any]) => {
          totalBookings++;

          console.log(`\n--- Booking ${totalBookings} (Key: ${key}) ---`);
          console.log('Full booking data:', JSON.stringify(booking, null, 2));

          console.log('statusPayment:', booking.statusPayment);
          console.log('status:', booking.status);
          console.log('paymentStatus:', booking.paymentStatus);
          console.log('price:', booking.price);
          console.log('createdAt:', booking.createdAt);

          const paymentStatus = booking.statusPayment || booking.paymentStatus || booking.status;

          if (paymentStatus !== 'paid') {
            console.log(`❌ Skipped: Payment status is "${paymentStatus}", not "paid"`);
            return;
          }

          paidBookings++;

          if (!booking.price) {
            console.log('❌ Skipped: No price');
            return;
          }

          const bookingDateStr = booking.createdAt;
          if (!bookingDateStr) {
            console.log('❌ Skipped: No createdAt');
            return;
          }

          const bookingDate = new Date(bookingDateStr);
          if (isNaN(bookingDate.getTime())) {
            console.warn('❌ Invalid date:', bookingDateStr);
            return;
          }

          const price = parseFloat(booking.price) || 0;

          console.log('✅ Valid booking - Date:', bookingDate, 'Price:', price);

          if (bookingDate >= currentPeriodStart && bookingDate <= currentPeriodEnd) {
            currentRevenue += price;
            console.log('✅ Added to current period');
          }

          if (bookingDate >= previousPeriodStart && bookingDate <= previousPeriodEnd) {
            previousRevenue += price;
            console.log('✅ Added to previous period');
          }
        });
      }

      console.log('\n=== SUMMARY ===');
      console.log('Total bookings:', totalBookings);
      console.log('Paid bookings:', paidBookings);
      console.log('Current Revenue:', currentRevenue);
      console.log('Previous Revenue:', previousRevenue);

      let growthPercentage = 0;
      if (previousRevenue > 0) {
        growthPercentage = parseFloat(
          (((currentRevenue - previousRevenue) / previousRevenue) * 100).toFixed(2)
        );
      } else if (currentRevenue > 0) {
        growthPercentage = 100;
      }

      const isPositiveGrowth = growthPercentage >= 0;

      return {
        currentPeriod: {
          amount: parseFloat(currentRevenue.toFixed(2)),
          label: currentLabel,
        },
        previousPeriod: {
          amount: parseFloat(previousRevenue.toFixed(2)),
          label: previousLabel,
        },
        growthPercentage: Math.abs(growthPercentage),
        isPositiveGrowth: isPositiveGrowth,
        comparisonText: `Compared to ${previousLabel.toLowerCase()}`,
      };
    } catch (error) {
      console.error('Error in getRevenueReport:', error);
      throw new InternalServerErrorException(
        `Lỗi khi lấy báo cáo doanh thu: ${error.message}`,
      );
    }
  }

  async getRevenueByVehicleType() {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();

      const allBookings = await this.firebaseService.readRecord('bookings');
      const allParks = await this.firebaseService.readRecord('park');

      if (!allBookings || !allParks) {
        throw new Error('Không thể đọc dữ liệu bookings hoặc park.');
      }

      const parkById = new Map<string, any>();
      Object.entries(allParks).forEach(([parkKey, park]: [string, any]) => {
        const candidates = [
          park.id,
          park.parkId,
          park._id,
          park.park_id
        ]
          .map(x => (x === undefined || x === null ? '' : String(x).trim()))
          .filter(Boolean);

        if (parkKey) candidates.push(String(parkKey));

        candidates.forEach(id => parkById.set(id, park));
      });

      const stats: Record<string, { months: number[]; totalBookings: number; paidBookings: number }> = {};

      Object.entries(allBookings).forEach(([bookingKey, booking]: [string, any]) => {
        const paymentStatus = booking.statusPayment || booking.paymentStatus || booking.status;
        if (!paymentStatus) return;
        if (String(paymentStatus).toLowerCase() !== 'paid') return;

        // parse date
        const bookingDate = new Date(booking.createdAt);
        if (isNaN(bookingDate.getTime())) return;

        if (bookingDate.getFullYear() !== currentYear) return;

        const price = Number(booking.price) || 0;

        const parkIdCandidates = [
          booking.parkId,
          booking.park_id,
          booking.idPark,
          booking.id_park,
          booking.park,
          booking.parkingId,
          booking.parking_id
        ]
          .map(x => (x === undefined || x === null ? '' : String(x).trim()))
          .filter(Boolean);

        let matchedPark: any = undefined;
        for (const pid of parkIdCandidates) {
          if (parkById.has(pid)) {
            matchedPark = parkById.get(pid);
            break;
          }
        }

        const typeFromBooking = booking.type_vehicle || booking.vehicle_type || booking.typeVehicle;

        const typeVehicle =
          (matchedPark && (matchedPark.type_vehicle || matchedPark.vehicle_type || matchedPark.typeVehicle)) ||
          typeFromBooking ||
          'Unknown';

        const typeKey = String(typeVehicle);

        if (!stats[typeKey]) {
          stats[typeKey] = { months: new Array(12).fill(0), totalBookings: 0, paidBookings: 0 };
        }

        stats[typeKey].totalBookings += 1;
        stats[typeKey].paidBookings += 1;

        const monthIndex = bookingDate.getMonth(); // 0..11
        stats[typeKey].months[monthIndex] += price;
      });

      const result = Object.keys(stats).map(type => {
        const s = stats[type];
        const monthsRounded = s.months.map(m => parseFloat(m.toFixed(2)));
        const total = monthsRounded.reduce((a, b) => a + b, 0);
        return {
          type_vehicle: type,
          year: currentYear,
          months: monthsRounded,
          totalYear: parseFloat(total.toFixed(2)),
          totalBookings: s.totalBookings,
          paidBookings: s.paidBookings,
        };
      });

      const labels = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        return m < 10 ? `0${m}` : `${m}`; // "01", "02", ...
      });

      return { labels, series: result };
    } catch (error) {
      console.error('Error in getRevenueByVehicleTypeAllMonths:', error);
      throw new InternalServerErrorException(
        `Lỗi khi lấy báo cáo doanh thu theo loại xe (tất cả tháng): ${error.message}`,
      );
    }
  }
}
