import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpdatePaymentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['paid', 'unpaid', 'refunded'])
  statusPayment: string;
}