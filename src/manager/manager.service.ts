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
}
