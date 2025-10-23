import * as crypto from 'crypto';
import axios from 'axios';

const PARTNER_CODE = process.env.MOMO_PARTNER_CODE!;
const ACCESS_KEY   = process.env.MOMO_ACCESS_KEY!;
const SECRET_KEY   = process.env.MOMO_SECRET_KEY!;
const ENDPOINT     = 'https://test-payment.momo.vn/v2/gateway/api/create'; // sandbox

function hmacSHA256(data: string, key: string) {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

export async function createMomoPayment({
  orderId, amount, orderInfo, redirectUrl, ipnUrl, extraData = ''
}: {
  orderId: string;            // id đơn của bạn
  amount: number;             // số tiền (VND)
  orderInfo: string;          // mô tả
  redirectUrl: string;        // app/web của bạn
  ipnUrl: string;             // webhook nhận IPN
  extraData?: string;         // base64 hoặc chuỗi tuỳ chọn
}) {
  const requestId   = `${PARTNER_CODE}-${Date.now()}`;
  const requestType = 'captureWallet'; // điển hình của AIO
  const lang        = 'vi';

  // raw string theo format tài liệu MoMo (thứ tự key quan trọng)
  const rawSignature =
    `accessKey=${ACCESS_KEY}&amount=${amount}&extraData=${extraData}` +
    `&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}` +
    `&partnerCode=${PARTNER_CODE}&redirectUrl=${redirectUrl}` +
    `&requestId=${requestId}&requestType=${requestType}`;

  const signature = hmacSHA256(rawSignature, SECRET_KEY);  // HMAC_SHA256

  const body = {
    partnerCode: PARTNER_CODE,
    partnerName: 'MoMo Payment',
    storeId: 'Test Store',
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    lang,
    extraData,
    requestType,
    signature,
  };

  const { data } = await axios.post(ENDPOINT, body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });

  // data thường có: payUrl, deeplink, qrCodeUrl, resultCode,...
  return data;
}
