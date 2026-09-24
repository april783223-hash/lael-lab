// api/kakao-token.js
// Vercel Serverless Function
// 카카오 Authorization Code → Access Token 교환 (서버 사이드)
// Client Secret은 Vercel 환경변수에서만 읽음 — 절대 프론트엔드에 노출 금지

export default async function handler(req, res) {
  // CORS: laellab.com 도메인만 허용
  const origin  = req.headers.origin || '';
  const allowed = ['https://laellab.com', 'https://www.laellab.com'];
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method Not Allowed' });

  const { code, redirect_uri } = req.body || {};

  // ── 환경변수에서 읽기 ─────────────────────────────────────────
  const REST_API_KEY  = process.env.KAKAO_REST_API_KEY;
  const CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;
  const REDIRECT_URI  = redirect_uri || 'https://www.laellab.com/oauth/kakao/callback';

  // ── 파라미터 존재 여부 디버그 로그 (실제 값은 절대 출력하지 않음) ──
  const paramCheck = {
    grant_type:    true,                    // 항상 'authorization_code'
    client_id:     !!REST_API_KEY,          // 환경변수 존재 여부만
    client_secret: !!CLIENT_SECRET,         // 환경변수 존재 여부만
    redirect_uri:  !!REDIRECT_URI,          // 값 존재 여부
    code:          !!code                   // 인가 코드 존재 여부
  };
  console.log('[Kakao] 토큰 요청 파라미터 존재 여부:', JSON.stringify(paramCheck));
  console.log('[Kakao] redirect_uri 값:', REDIRECT_URI);   // URI는 공개 정보이므로 출력

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code', paramCheck });
  }
  if (!REST_API_KEY || !CLIENT_SECRET) {
    console.error('[Kakao] 환경변수 미설정 — KAKAO_REST_API_KEY 또는 KAKAO_CLIENT_SECRET 누락');
    return res.status(500).json({
      error: 'Server configuration error',
      paramCheck
    });
  }

  try {
    const body = new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     REST_API_KEY,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      code:          code
    });

    const kakaoRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body
    });

    const kakaoStatus = kakaoRes.status;
    const data        = await kakaoRes.json();

    // ── 실패 시 카카오 응답 전체 로그 (민감 값 없으므로 전부 출력) ──
    if (!kakaoRes.ok || data.error) {
      console.error('[Kakao] 토큰 교환 실패 ─────────────────────────');
      console.error('  HTTP status      :', kakaoStatus);
      console.error('  error            :', data.error           || '(없음)');
      console.error('  error_description:', data.error_description || '(없음)');
      console.error('  error_code       :', data.error_code      ?? '(없음)');
      console.error('  paramCheck       :', JSON.stringify(paramCheck));
      console.error('─────────────────────────────────────────────────');

      return res.status(400).json({
        error:             data.error            || 'token_exchange_failed',
        error_description: data.error_description || '',
        error_code:        data.error_code        ?? null,
        kakao_http_status: kakaoStatus,
        paramCheck
      });
    }

    // ── 성공: access_token만 반환 ────────────────────────────────
    console.log('[Kakao] 토큰 교환 성공 (expires_in:', data.expires_in, 's)');
    return res.status(200).json({
      access_token: data.access_token,
      token_type:   data.token_type,
      expires_in:   data.expires_in
    });

  } catch (err) {
    console.error('[Kakao] 서버 내부 오류:', err.message);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
