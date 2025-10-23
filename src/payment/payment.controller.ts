import { Controller, Post, Body } from '@nestjs/common';
import { createMomoPayment } from './payment.service';
import * as crypto from 'crypto';
import { Headers, Req, Res } from '@nestjs/common';

function sign(data: string, key: string) {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

@Controller('payments')
export class PaymentsController {
  @Post('momo/create')
  async create(@Body() dto: { orderId: string; amount: number; orderInfo: string }) {
    const redirectUrl = process.env.APP_REDIRECT_URL!; // ví dụ: https://yourapp.com/momo-return
    const ipnUrl      = process.env.MOMO_IPN_URL!;     // ví dụ: https://api.yourapp.com/payments/momo/ipn
    return await createMomoPayment({ ...dto, redirectUrl, ipnUrl });
  }

  @Post('momo/ipn')
  async ipn(@Req() req, @Res() res) {
    const body = req.body;
    // MoMo gửi nhiều field; tạo rawSignature theo tài liệu IPN (đúng thứ tự key)
    const raw =
      `accessKey=${process.env.MOMO_ACCESS_KEY}` +
      `&amount=${body.amount}&extraData=${body.extraData}` +
      `&message=${body.message}&orderId=${body.orderId}` +
      `&orderInfo=${body.orderInfo}&orderType=${body.orderType}` +
      `&partnerCode=${body.partnerCode}&payType=${body.payType}` +
      `&requestId=${body.requestId}&responseTime=${body.responseTime}` +
      `&resultCode=${body.resultCode}&transId=${body.transId}`;
    const expected = sign(raw, process.env.MOMO_SECRET_KEY!);

    if (expected !== body.signature) {
      return res.status(400).json({ resultCode: 940, message: 'Invalid signature' });
    }

    // TODO: cập nhật trạng thái đơn hàng theo resultCode (0 = thành công)
    // tránh double-spend: kiểm tra idempotency bằng orderId/requestId

    return res.json({ resultCode: 0, message: 'ok' });
  }
}