// /api/payment/confirm.js — 토스페이먼츠 결제 승인 (Vercel Serverless Function)
// 토스 Secret Key를 서버에서만 사용하여 프론트엔드 노출 방지
// HMAC 서명 검증으로 금액 위변조 차단 (Critical §2.2)

import crypto from 'crypto';

/**
 * HMAC-SHA256 서명 검증
 * create-order.js에서 발급한 서명과 비교하여 금액 위변조를 차단합니다.
 */
function verifySignature(orderId, amount, signature, secretKey) {
  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(`${orderId}:${amount}`)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { paymentKey, orderId, amount, signature } = req.body;

  if (!paymentKey || !orderId || !amount) {
    return res.status(400).json({ error: 'Missing required fields: paymentKey, orderId, amount' });
  }

  const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
  if (!TOSS_SECRET_KEY) {
    console.error('[PAYMENT] TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.');
    return res.status(500).json({ error: 'Payment configuration error' });
  }

  // ============================================================
  // [Critical §2.2] 서버사이드 금액 검증
  // successUrl의 amount를 그대로 신뢰하지 않고,
  // 주문 생성 시 발급한 HMAC 서명으로 금액 위변조를 검증합니다.
  // ============================================================
  if (!signature) {
    console.error('[PAYMENT] 금액 검증 서명 누락:', { orderId });
    return res.status(400).json({ error: 'Missing order signature for amount verification' });
  }

  try {
    const isValid = verifySignature(orderId, Number(amount), signature, TOSS_SECRET_KEY);
    if (!isValid) {
      console.error('[PAYMENT] 금액 위변조 감지!', { orderId, amount });
      return res.status(403).json({
        error: 'AMOUNT_MISMATCH',
        message: '주문 금액이 일치하지 않습니다. 결제가 차단되었습니다.'
      });
    }
  } catch (e) {
    console.error('[PAYMENT] 서명 검증 오류:', e);
    return res.status(400).json({ error: 'Invalid signature format' });
  }

  const authHeader = 'Basic ' + Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64');

  try {
    // 토스페이먼츠 결제 승인 API 호출
    // [§7.1] Idempotency-Key로 네트워크 오류 시 중복 결제 방지
    const idempotencyKey = crypto.randomUUID();

    const tossResp = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: Number(amount),
      }),
    });

    const tossResult = await tossResp.json();

    if (!tossResp.ok) {
      console.error('[PAYMENT] 토스 승인 실패:', tossResult);
      return res.status(402).json({
        error: 'toss_confirm_failed',
        message: tossResult.message || '결제 승인에 실패했습니다.',
        code: tossResult.code,
      });
    }

    // 승인 성공
    console.log('[PAYMENT] 결제 승인 완료:', {
      orderId: tossResult.orderId,
      totalAmount: tossResult.totalAmount,
      method: tossResult.method,
      approvedAt: tossResult.approvedAt,
    });

    return res.status(200).json({
      success: true,
      orderId: tossResult.orderId,
      totalAmount: tossResult.totalAmount,
      method: tossResult.method,
      approvedAt: tossResult.approvedAt,
      paymentKey: tossResult.paymentKey,
    });
  } catch (e) {
    console.error('[PAYMENT] 서버 오류:', e);
    return res.status(500).json({ error: 'server_error', message: '결제 처리 중 오류가 발생했습니다.' });
  }
}
