// api/kakao-token.js  ←  Vercel Serverless Function (CommonJS)
// 카카오 Authorization Code → Access Token 교환 (서버 사이드)
// Client Secret은 Vercel 환경변수에서만 읽음 — 절대 프론트엔드에 노출 금지

module.exports = async function handler(req, res) {
  // ── CORS: laellab.com 도메인만 허용 ──────────────────────────
  const origin  = req.headers.origin || '';
  const allowed = ['https://laellab.com', 'https://www.laellab.com'];
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method Not Allowed' });

  // ── 요청 body 파싱 ────────────────────────────────────────────
  const body_data   = req.body || {};
  const code        = body_data.code;
  const redirect_uri = body_data.redirect_uri;

  // ── 환경변수 읽기 (서버에서만) ───────────────────────────────
  const REST_API_KEY  = process.env.KAKAO_REST_API_KEY;
  const CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;
  const REDIRECT_URI  = redirect_uri || 'https://www.laellab.com/oauth/kakao/callback';

  // ── 진단 로그 (값 절대 출력 안 함) ───────────────────────────
  const kakaoEnvKeys = Object.keys(process.env).filter(k => k.startsWith('KAKAO'));
  console.log('[Kakao API] ENV 진단:', {
    KAKAO_REST_API_KEY_exists:  !!REST_API_KEY,
    KAKAO_REST_API_KEY_length:  REST_API_KEY?.length ?? 0,
    KAKAO_CLIENT_SECRET_exists: !!CLIENT_SECRET,
    KAKAO_CLIENT_SECRET_length: CLIENT_SECRET?.length ?? 0,
    kakaoEnvKeys,
    redirect_uri:               REDIRECT_URI,
    code_exists:                !!code,
    VERCEL:                     process.env.VERCEL,
    NODE_ENV:                   process.env.NODE_ENV,
  });

  // ── 파라미터 존재 여부 (값 미포함) ───────────────────────────
  const paramCheck = {
    grant_type:    true,
    client_id:     !!REST_API_KEY,
    client_secret: !!CLIENT_SECRET,
    redirect_uri:  !!REDIRECT_URI,
    code:          !!code
  };

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code', paramCheck });
  }
  if (!REST_API_KEY || !CLIENT_SECRET) {
    console.error('[Kakao API] 환경변수 미설정 — paramCheck:', paramCheck);
    return res.status(500).json({ error: 'Server configuration error', paramCheck });
  }

  // ── 카카오 토큰 교환 ─────────────────────────────────────────
  try {
    const kakaoRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     REST_API_KEY,
        client_secret: CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        code:          code
      })
    });

    const kakaoStatus = kakaoRes.status;
    const data        = await kakaoRes.json();

    if (!kakaoRes.ok || data.error) {
      console.error('[Kakao API] 토큰 교환 실패:', {
        kakaoStatus,
        error:             data.error,
        error_description: data.error_description,
        error_code:        data.error_code,
        paramCheck
      });
      return res.status(400).json({
        error:             data.error            || 'token_exchange_failed',
        error_description: data.error_description || '',
        error_code:        data.error_code        ?? null,
        kakao_http_status: kakaoStatus,
        paramCheck
      });
    }

    console.log('[Kakao API] 토큰 교환 성공 (expires_in:', data.expires_in, 's)');
    return res.status(200).json({
      access_token: data.access_token,
      token_type:   data.token_type,
      expires_in:   data.expires_in
    });

  } catch (err) {
    console.error('[Kakao API] fetch 오류:', err.message);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};
