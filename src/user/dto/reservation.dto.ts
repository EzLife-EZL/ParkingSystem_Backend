import { IsDate, IsNumber, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

export class ReservationDto {
    @IsString()
    parkId: string;

    @IsString()
    slotId: string;

    @IsString()
    userId: string;

    @Type(() => Date)
    @IsDate()
    startTime: Date;

    @Type(() => Date)
    @IsDate()
    endTime: Date;

    @IsOptional()
    @IsString()
    qrCode?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    slotStatus?: string;

    @IsOptional()
    @IsString()
    paymentMethod?: string;

    @IsOptional()
    @IsNumber()
    price?: number;

    @IsOptional()
    @IsString()
    statusPayment?: string;

    @IsOptional()
    @IsString()
    numberPlate?: string;

    @Type(() => Date)
    @IsOptional()
    @IsDate()
    createdAt?: Date;
}
