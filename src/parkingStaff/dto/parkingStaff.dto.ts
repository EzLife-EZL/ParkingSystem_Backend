import {
    IsString,
    IsNumber,
    IsOptional,
    IsNotEmpty
} from 'class-validator';

export class WalkInBookingDto {
  @IsString()
  @IsNotEmpty()
  parkId: string;

  @IsString()
  @IsNotEmpty()
  slotId: string;

  @IsString()
  @IsNotEmpty()
  numberPlate: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsString()
  @IsOptional()
  type_vehicle?: string;
}