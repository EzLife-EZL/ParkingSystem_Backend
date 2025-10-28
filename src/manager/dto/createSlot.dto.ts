import {
    IsString,
    IsObject,
    ValidateNested,
    IsNumber,
    IsIn,
    IsBoolean,
    IsArray
} from 'class-validator';
import { Type } from 'class-transformer';

class SlotDto {
    @IsBoolean()
    isBooked: boolean;

    @IsString()
    slotName: string;

    @IsString()
    pos_X: number;

    @IsString()
    pos_Y: number;
}

class SlotDataDto {
    @IsString()
    address: string;

    @IsString()
    park_name: string;

    @IsString()
    @IsIn(['Car', 'Bike'])
    type_vehicle: string;

    @IsNumber()
    price: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SlotDto)
    slots: SlotDto[];
}

export class CreateSlotDto {
    @IsString()
    path: string;

    @IsObject()
    @ValidateNested()
    @Type(() => SlotDataDto)
    data: SlotDataDto;
}
