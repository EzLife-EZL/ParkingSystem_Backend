import {
    IsString,
    IsNotEmpty,
    IsIn,
} from 'class-validator';

export class BookingStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['pending', 'confirmed', 'completed', 'cancelled'])
  status: string;
}