import {
  Injectable,
} from '@nestjs/common';
import { Express } from 'express';
import { CreateSlotDto } from './dto/createSlot.dto';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class ManagerService {
  constructor(
    private firebaseService: FirebaseService,
  ) { }

  async createParkingSlot(path: string, body: CreateSlotDto) {
    const parkData = body.data;
    const { park_name, slots } = parkData;

    const existingParks = await this.firebaseService.readRecord(path);
    const parkKey = Object.keys(existingParks || {}).find(
      key => existingParks[key].park_name === park_name,
    );

    if (parkKey) {
      const existingSlots = existingParks[parkKey].slots || [];
      const existingSlotNames = existingSlots.map((s: any) => s.slotName);

      const duplicateSlots = slots.filter(s =>
        existingSlotNames.includes(s.slotName),
      );

      if (duplicateSlots.length > 0) {
        throw new Error(
          `Các slot bị trùng tên: ${duplicateSlots.map(s => s.slotName).join(', ')}.`,
        );
      }

      // filter valid slots
      const validNewSlots = slots.filter(
        s => s && s.slotName && s.pos_X && s.pos_Y && typeof s.isBooked === 'boolean',
      );

      const validExistingSlots = existingSlots.filter(s => s && s.slotName);

      const updatedSlots = [...validExistingSlots, ...validNewSlots];

      // only update slots
      await this.firebaseService.updateRecord(`${path}/${parkKey}`, {
        slots: updatedSlots,
      });

      return {
        message: `Đã thêm ${validNewSlots.length} slot mới vào ${park_name}.`,
        parkId: parkKey,
      };
    } else {
      const newPark = await this.firebaseService.createRecord(path, parkData);
      return {
        message: `Tạo mới bãi xe ${park_name} thành công.`,
        data: newPark,
      };
    }
  }

  async getAllParkingSlots(pathName: string) {
    return this.firebaseService.readRecord(pathName);
  }

  async getParkById(parkId: string) {
    return this.firebaseService.readRecord(`park/${parkId}`);
  }
}