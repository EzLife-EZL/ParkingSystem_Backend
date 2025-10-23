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
      const existingSlotsData = await this.firebaseService.readRecord(`${path}/${parkKey}/slots`) || {};

      const existingSlotNames = Object.values(existingSlotsData)
        .map((s: any) => s.slotName);

      const duplicateSlots = slots.filter(s =>
        existingSlotNames.includes(s.slotName),
      );

      if (duplicateSlots.length > 0) {
        throw new Error(
          `Các slot bị trùng tên: ${duplicateSlots.map(s => s.slotName).join(', ')}.`,
        );
      }

      // ✅ Tạo slotId tự động bằng Firebase push()
      const createdSlots: any[] = [];
      for (const slot of slots) {
        if (slot && slot.slotName && slot.pos_X && slot.pos_Y && typeof slot.isBooked === 'boolean') {
          const newSlot = await this.firebaseService.createRecord(
            `${path}/${parkKey}/slots`,
            slot
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
      // ✅ Nếu bãi chưa tồn tại → tạo bãi mới trước
      const newPark = await this.firebaseService.createRecord(path, {
        ...parkData,
        slots: {},
      });

      // Sau đó thêm slot vào bãi vừa tạo
      const createdSlots: any[] = [];
      for (const slot of slots) {
        const newSlot = await this.firebaseService.createRecord(
          `${path}/${newPark.id}/slots`,
          slot
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

    // Chuyển object thành array với format mong muốn
    const result = Object.entries(data).map(([parkId, parkData]: [string, any]) => {
      return {
        park_id: parkId,
        park_name: parkData.park_name || '',
        address: parkData.address || '',
        price: parkData.price || 0,
        type_vehicle: parkData.type_vehicle || '',
        slots: parkData.slots ? Object.entries(parkData.slots).map(([slotId, slotData]: [string, any]) => {
          return {
            slot_id: slotId,
            slot_name: slotData.slot_name || '',
            pos_X: slotData.pos_x || 0,
            pos_Y: slotData.pos_y || 0,
            status: slotData.status || 'AVAILABLE',
            spotNumber: slotData.spot_number || '',
            ...slotData // Giữ lại các field khác nếu có
          };
        }) : []
      };
    });

    return result;
  }


  async getParkById(parkId: string) {
    const parkData = await this.firebaseService.readRecord(`park/${parkId}`);

    // Nếu không có dữ liệu hoặc không phải object => trả về null
    if (!parkData || typeof parkData !== 'object') {
      return null;
    }

    // Format lại dữ liệu cùng dạng với getAllParkingSlots
    const result = {
      park_id: parkId,
      park_name: parkData.park_name || '',
      address: parkData.address || '',
      price: parkData.price || 0,
      type_vehicle: parkData.type_vehicle || '',
      slots: parkData.slots
        ? Object.entries(parkData.slots).map(([slotId, slotData]: [string, any]) => {
            return {
              slot_id: slotId,
              pos_X: slotData.pos_x || 0,
              pos_Y: slotData.pos_y || 0,
              status: slotData.status || 'AVAILABLE',
              spotNumber: slotData.spot_number || '',
              slot_name: slotData.slot_name || '',
              ...slotData, // giữ lại field khác nếu có
            };
          })
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
    return this.firebaseService.updateRecord(`park/${parkId}/slots/${slotId}`, body);
  }
}