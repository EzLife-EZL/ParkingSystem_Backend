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

  /**
   * Get revenue report với filter chuẩn hóa
   * @param period: 'day' | 'week' | 'month' | 'year'
   */
  async getRevenueReport(period: string) {
    try {
      const now = new Date();
      const { currentPeriodStart, currentPeriodEnd, previousPeriodStart, previousPeriodEnd, currentLabel, previousLabel } = 
        this.calculatePeriodRanges(period, now);

      console.log('=== REVENUE REPORT ===');
      console.log('Period:', period);
      console.log('Current:', currentPeriodStart, 'to', currentPeriodEnd);
      console.log('Previous:', previousPeriodStart, 'to', previousPeriodEnd);

      const allBookings = await this.firebaseService.readRecord('bookings');

      if (!allBookings || typeof allBookings !== 'object') {
        return this.getEmptyRevenueReport(currentLabel, previousLabel);
      }

      const { currentRevenue, previousRevenue, totalBookings, paidBookings } = 
        this.calculatePeriodRevenue(allBookings, currentPeriodStart, currentPeriodEnd, previousPeriodStart, previousPeriodEnd);

      console.log('Total bookings:', totalBookings);
      console.log('Paid bookings:', paidBookings);
      console.log('Current Revenue:', currentRevenue);
      console.log('Previous Revenue:', previousRevenue);

      const growthPercentage = this.calculateGrowthPercentage(currentRevenue, previousRevenue);
      const isPositiveGrowth = growthPercentage >= 0;

      return {
        period,
        currentPeriod: {
          amount: parseFloat(currentRevenue.toFixed(2)),
          label: currentLabel,
          startDate: currentPeriodStart.toISOString(),
          endDate: currentPeriodEnd.toISOString(),
        },
        previousPeriod: {
          amount: parseFloat(previousRevenue.toFixed(2)),
          label: previousLabel,
          startDate: previousPeriodStart.toISOString(),
          endDate: previousPeriodEnd.toISOString(),
        },
        statistics: {
          totalBookings,
          paidBookings,
          averageRevenuePerBooking: paidBookings > 0 
            ? parseFloat((currentRevenue / paidBookings).toFixed(2))
            : 0,
        },
        growthPercentage: Math.abs(growthPercentage),
        isPositiveGrowth,
        comparisonText: `Compared to ${previousLabel.toLowerCase()}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error in getRevenueReport:', error);
      throw new InternalServerErrorException(
        `Lỗi khi lấy báo cáo doanh thu: ${error.message}`,
      );
    }
  }

  /**
   * Get revenue by vehicle type với filter
   * @param period: 'day' | 'week' | 'month' | 'year'
   */
  async getRevenueByVehicleType(period: string = 'year') {
    try {
      const now = new Date();
      const { startDate, endDate, labels } = this.getDateRangeForVehicleType(period, now);

      console.log('=== REVENUE BY VEHICLE TYPE ===');
      console.log('Period:', period);
      console.log('Date range:', startDate, 'to', endDate);

      const allBookings = await this.firebaseService.readRecord('bookings');
      const allParks = await this.firebaseService.readRecord('park');

      if (!allBookings || !allParks) {
        throw new Error('Không thể đọc dữ liệu bookings hoặc park.');
      }

      // Build park lookup map
      const parkById = this.buildParkLookupMap(allParks);

      // Calculate revenue by vehicle type
      const stats = this.calculateVehicleTypeRevenue(
        allBookings, 
        parkById, 
        startDate, 
        endDate, 
        period
      );

      const result = this.formatVehicleTypeResult(stats, labels, period, startDate, endDate);

      return result;
    } catch (error) {
      console.error('Error in getRevenueByVehicleType:', error);
      throw new InternalServerErrorException(
        `Lỗi khi lấy báo cáo doanh thu theo loại xe: ${error.message}`,
      );
    }
  }

  // Thêm: tổng doanh thu theo bộ lọc (ví dụ 'week' = từ hôm nay về 7 ngày trước)
  async getTotalRevenue(period: string = 'month') {
    try {
      const now = new Date();
      const startDate = this.getStartDateForPeriod(period, now);

      const allBookings = await this.firebaseService.readRecord('bookings');
      if (!allBookings || typeof allBookings !== 'object') {
        return {
          period,
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          totalRevenue: 0,
          totalBookings: 0,
          paidBookings: 0,
        };
      }

      let totalRevenue = 0;
      let totalBookings = 0;
      let paidBookings = 0;

      Object.values(allBookings).forEach((booking: any) => {
        totalBookings++;

        const paymentStatus = booking.statusPayment || booking.paymentStatus || booking.status;
        if (String(paymentStatus).toLowerCase() !== 'paid') {
          return;
        }

        const bookingDateStr = booking.createdAt || booking.created_at || booking.date;
        if (!bookingDateStr) return;

        const bookingDate = new Date(bookingDateStr);
        if (isNaN(bookingDate.getTime())) return;

        if (bookingDate < startDate || bookingDate > now) return;

        const price = parseFloat(booking.price) || Number(booking.price) || 0;
        totalRevenue += price;
        paidBookings++;
      });

      return {
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalBookings,
        paidBookings,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Lỗi khi tính tổng doanh thu: ${error.message}`,
      );
    }
  }

  // helper: xác định ngày bắt đầu theo period
  private getStartDateForPeriod(period: string, now: Date): Date {
    const p = (period || 'month').toLowerCase();
    switch (p) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Calculate period ranges dựa trên filter
   */
  private calculatePeriodRanges(period: string, now: Date) {
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

      case 'week':
        // Current week (Monday to Sunday)
        currentPeriodStart = new Date(now);
        const dayOfWeek = currentPeriodStart.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
        currentPeriodStart.setDate(currentPeriodStart.getDate() - diff);
        currentPeriodStart.setHours(0, 0, 0, 0);

        currentPeriodEnd = new Date(currentPeriodStart);
        currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 6);
        currentPeriodEnd.setHours(23, 59, 59, 999);

        // Previous week
        previousPeriodStart = new Date(currentPeriodStart);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
        previousPeriodEnd = new Date(currentPeriodEnd);
        previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 7);

        currentLabel = 'This Week';
        previousLabel = 'Last Week';
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

    return {
      currentPeriodStart,
      currentPeriodEnd,
      previousPeriodStart,
      previousPeriodEnd,
      currentLabel,
      previousLabel,
    };
  }

  /**
   * Calculate revenue cho current và previous period
   */
  private calculatePeriodRevenue(
    allBookings: any,
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date
  ) {
    let currentRevenue = 0;
    let previousRevenue = 0;
    let totalBookings = 0;
    let paidBookings = 0;

    Object.entries(allBookings).forEach(([key, booking]: [string, any]) => {
      totalBookings++;

      const paymentStatus = booking.statusPayment || booking.paymentStatus || booking.status;
      if (String(paymentStatus).toLowerCase() !== 'paid') {
        return;
      }

      paidBookings++;

      const bookingDateStr = booking.createdAt || booking.created_at || booking.date;
      if (!bookingDateStr) return;

      const bookingDate = new Date(bookingDateStr);
      if (isNaN(bookingDate.getTime())) return;

      const price = parseFloat(booking.price) || 0;

      if (bookingDate >= currentStart && bookingDate <= currentEnd) {
        currentRevenue += price;
      }

      if (bookingDate >= previousStart && bookingDate <= previousEnd) {
        previousRevenue += price;
      }
    });

    return { currentRevenue, previousRevenue, totalBookings, paidBookings };
  }

  /**
   * Calculate growth percentage
   */
  private calculateGrowthPercentage(current: number, previous: number): number {
    if (previous > 0) {
      return parseFloat((((current - previous) / previous) * 100).toFixed(2));
    } else if (current > 0) {
      return 100;
    }
    return 0;
  }

  /**
   * Get date range cho vehicle type report
   */
  private getDateRangeForVehicleType(period: string, now: Date) {
    let startDate: Date;
    let endDate: Date;
    let labels: string[];

    switch (period.toLowerCase()) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
        break;

      case 'week':
        startDate = new Date(now);
        const dayOfWeek = startDate.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate.setDate(startDate.getDate() - diff);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        break;

      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const daysInMonth = endDate.getDate();
        labels = Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          return day < 10 ? `0${day}` : `${day}`;
        });
        break;

      case 'year':
      default:
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        labels = Array.from({ length: 12 }, (_, i) => {
          const m = i + 1;
          return m < 10 ? `0${m}` : `${m}`;
        });
        break;
    }

    return { startDate, endDate, labels };
  }

  /**
   * Build park lookup map
   */
  private buildParkLookupMap(allParks: any): Map<string, any> {
    const parkById = new Map<string, any>();

    Object.entries(allParks).forEach(([parkKey, park]: [string, any]) => {
      const candidates = [
        park.id,
        park.parkId,
        park._id,
        park.park_id,
      ]
        .map(x => (x === undefined || x === null ? '' : String(x).trim()))
        .filter(Boolean);

      if (parkKey) candidates.push(String(parkKey));

      candidates.forEach(id => parkById.set(id, park));
    });

    return parkById;
  }

  /**
   * Calculate revenue by vehicle type
   */
  private calculateVehicleTypeRevenue(
    allBookings: any,
    parkById: Map<string, any>,
    startDate: Date,
    endDate: Date,
    period: string
  ) {
    const stats: Record<string, { 
      timeData: number[]; 
      totalBookings: number; 
      paidBookings: number;
      totalRevenue: number;
    }> = {};

    // Determine time slots based on period
    const timeSlots = this.getTimeSlots(period, startDate, endDate);

    Object.entries(allBookings).forEach(([bookingKey, booking]: [string, any]) => {
      const paymentStatus = booking.statusPayment || booking.paymentStatus || booking.status;
      if (String(paymentStatus).toLowerCase() !== 'paid') return;

      const bookingDateStr = booking.createdAt || booking.created_at || booking.date;
      if (!bookingDateStr) return;

      const bookingDate = new Date(bookingDateStr);
      if (isNaN(bookingDate.getTime())) return;

      // Check if booking is within date range
      if (bookingDate < startDate || bookingDate > endDate) return;

      const price = Number(booking.price) || 0;

      // Find matching park
      const parkIdCandidates = [
        booking.parkId,
        booking.park_id,
        booking.idPark,
        booking.id_park,
        booking.park,
        booking.parkingId,
        booking.parking_id,
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
        stats[typeKey] = {
          timeData: new Array(timeSlots).fill(0),
          totalBookings: 0,
          paidBookings: 0,
          totalRevenue: 0,
        };
      }

      stats[typeKey].totalBookings += 1;
      stats[typeKey].paidBookings += 1;
      stats[typeKey].totalRevenue += price;

      // Determine time index
      const timeIndex = this.getTimeIndex(period, bookingDate, startDate);
      if (timeIndex >= 0 && timeIndex < timeSlots) {
        stats[typeKey].timeData[timeIndex] += price;
      }
    });

    return stats;
  }

  /**
   * Get number of time slots based on period
   */
  private getTimeSlots(period: string, startDate: Date, endDate: Date): number {
    switch (period.toLowerCase()) {
      case 'day':
        return 24; // hours
      case 'week':
        return 7; // days
      case 'month':
        return endDate.getDate(); // days in month
      case 'year':
        return 12; // months
      default:
        return 12;
    }
  }

  /**
   * Get time index for booking
   */
  private getTimeIndex(period: string, bookingDate: Date, startDate: Date): number {
    switch (period.toLowerCase()) {
      case 'day':
        return bookingDate.getHours();
      case 'week':
        const dayOfWeek = bookingDate.getDay();
        return dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
      case 'month':
        return bookingDate.getDate() - 1;
      case 'year':
        return bookingDate.getMonth();
      default:
        return bookingDate.getMonth();
    }
  }

  /**
   * Format vehicle type result
   */
  private formatVehicleTypeResult(
    stats: any,
    labels: string[],
    period: string,
    startDate: Date,
    endDate: Date
  ) {
    const series = Object.entries(stats).map(([type, data]: [string, any]) => {
      const timeDataRounded = data.timeData.map(v => parseFloat(v.toFixed(2)));
      return {
        type_vehicle: type,
        period,
        data: timeDataRounded,
        totalRevenue: parseFloat(data.totalRevenue.toFixed(2)),
        totalBookings: data.totalBookings,
        paidBookings: data.paidBookings,
        averageRevenue: data.paidBookings > 0 
          ? parseFloat((data.totalRevenue / data.paidBookings).toFixed(2))
          : 0,
      };
    });

    return {
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      labels,
      series,
      summary: {
        totalVehicleTypes: series.length,
        totalRevenue: parseFloat(
          series.reduce((sum, s) => sum + s.totalRevenue, 0).toFixed(2)
        ),
        totalBookings: series.reduce((sum, s) => sum + s.totalBookings, 0),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get empty revenue report
   */
  private getEmptyRevenueReport(currentLabel: string, previousLabel: string) {
    return {
      currentPeriod: {
        amount: 0,
        label: currentLabel,
      },
      previousPeriod: {
        amount: 0,
        label: previousLabel,
      },
      statistics: {
        totalBookings: 0,
        paidBookings: 0,
        averageRevenuePerBooking: 0,
      },
      growthPercentage: 0,
      isPositiveGrowth: true,
      comparisonText: `Compared to ${previousLabel.toLowerCase()}`,
      timestamp: new Date().toISOString(),
    };
  }
}

