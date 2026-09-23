// api/kakao-token.js
// Vercel Serverless Function
// 카카오 Authorization Code → Access Token 교환 (서버 사이드)
// Client Secret은 Vercel 환경변수에서만 읽음 — 절대 프론트엔드에 노출 금지

export default async function handler(req, res) {
  // CORS: laellab.com 도메인만 허용
  const origin = req.headers.origin || '';
  const allowed = ['https://laellab.com', 'https://www.laellab.com'];
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, redirect_uri } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  // 환경변수에서 읽기 (Vercel 대시보드에 등록)
  const REST_API_KEY   = process.env.KAKAO_REST_API_KEY;
  const CLIENT_SECRET  = process.env.KAKAO_CLIENT_SECRET;
  const REDIRECT_URI   = redirect_uri || 'https://laellab.com';

  if (!REST_API_KEY || !CLIENT_SECRET) {
    console.error('[Kakao] 환경변수 KAKAO_REST_API_KEY 또는 KAKAO_CLIENT_SECRET 미설정');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const kakaoRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     REST_API_KEY,
        client_secret: CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        code:          code
      })
    });

    const data = await kakaoRes.json();

    if (!kakaoRes.ok || data.error) {
      console.error('[Kakao] 토큰 교환 실패:', data);
      return res.status(400).json({
        error: data.error || 'token_exchange_failed',
        error_description: data.error_description || ''
      });
    }

    // access_token만 반환 (refresh_token 등 민감 정보는 필요시에만 포함)
    return res.status(200).json({
      access_token:  data.access_token,
      token_type:    data.token_type,
      expires_in:    data.expires_in
    });

  } catch (err) {
    console.error('[Kakao] 서버 오류:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
