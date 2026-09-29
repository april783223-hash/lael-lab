// /api/payment/create-order.js — 주문 생성 및 금액 서명 발급 (Vercel Serverless Function)
// 서버사이드 금액 검증을 위해 HMAC 서명으로 주문 정보를 보호합니다.

import crypto from 'crypto';

// ============================================================
// 서버사이드 상품 가격 맵 (Source of Truth)
// 클라이언트에서 조작할 수 없는 서버 전용 가격표
// ============================================================
const PRODUCT_PRICES = {
  'ebook':     79000,   // 대입면접이 쉬워지는 스피치 공식 전자책
  'vod':       149000,  // 대입면접이 쉬워지는 스피치 공식 VOD 강의
  'package':   299000,  // 2027 대입 면접 올인원 패키지 (전자책 + VOD + AI 검토 90일)
  'class':     149000,  // 온라인 특강
  'ebook-mom': 79000,   // 엄마와 아이의 단단한 말하기 전자책
  'ebook-dantan': 79000, // 단단한 말하기 전자책
};

/**
 * HMAC-SHA256 서명 생성
 * orderId + amount를 Secret Key로 서명하여 금액 위변조를 방지합니다.
 */
function createSignature(orderId, amount, secretKey) {
  return crypto
    .createHmac('sha256', secretKey)
    .update(`${orderId}:${amount}`)
    .digest('hex');
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

  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ error: 'Missing required field: productId' });
  }

  // 서버사이드 가격 조회
  const amount = PRODUCT_PRICES[productId];
  if (amount === undefined) {
    return res.status(400).json({ error: 'Invalid productId', validProducts: Object.keys(PRODUCT_PRICES) });
  }

  const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
  if (!TOSS_SECRET_KEY) {
    console.error('[ORDER] TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // 고유 주문번호 생성 (서버에서 생성 → 클라이언트 조작 불가)
  const orderId = 'LAEL_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex').toUpperCase();

  // HMAC 서명 생성 (orderId + amount → Secret Key로 서명)
  const signature = createSignature(orderId, amount, TOSS_SECRET_KEY);

  console.log('[ORDER] 주문 생성:', { orderId, productId, amount });

  return res.status(200).json({
    orderId,
    amount,
    productId,
    signature,
  });
}
