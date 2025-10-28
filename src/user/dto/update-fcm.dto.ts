import { IsNotEmpty, IsMongoId, IsIn, IsString, IsArray, IsOptional } from 'class-validator';

export class UpdateFcmDto {
    @IsNotEmpty()
    token: string;
}