// /api/payment/confirm.js — 토스페이먼츠 결제 승인 (Vercel Serverless Function)
// 토스 Secret Key를 서버에서만 사용하여 프론트엔드 노출 방지

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

  const { paymentKey, orderId, amount } = req.body;

  if (!paymentKey || !orderId || !amount) {
    return res.status(400).json({ error: 'Missing required fields: paymentKey, orderId, amount' });
  }

  const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
  if (!TOSS_SECRET_KEY) {
    console.error('[PAYMENT] TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.');
    return res.status(500).json({ error: 'Payment configuration error' });
  }

  const authHeader = 'Basic ' + Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64');

  try {
    // 토스페이먼츠 결제 승인 API 호출
    const tossResp = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
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
