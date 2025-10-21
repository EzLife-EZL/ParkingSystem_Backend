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
    slotId: string;

    @IsString()
    slotName: string;

    @IsString()
    pos_X: string;

    @IsString()
    pos_Y: string;
}

class SlotDataDto {
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
