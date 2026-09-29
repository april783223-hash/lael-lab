// ============================================================
// LAEL LAB - 토스페이먼츠 결제 연동 + Firestore 결제 기록 저장
// ============================================================

const TOSS_CONFIG = {
  clientKey: "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm", // 토스페이먼츠 테스트 Client Key (라이브 전환 시 교체)
  customerKey: null, // 로그인 사용자의 UID 또는 랜덤 생성
};

// 토스페이먼츠 SDK 초기화
let tossPayments = null;
let tossWidgets = null;

async function initTossPayments() {
  if (tossPayments) return tossPayments;
  if (typeof TossPayments === 'undefined') {
    console.warn('[TOSS] SDK가 로드되지 않았습니다.');
    return null;
  }
  tossPayments = TossPayments(TOSS_CONFIG.clientKey);
  return tossPayments;
}

// ============================================================
// 비회원(게스트) 구매 토큰 관리
// ============================================================
const GUEST_PURCHASE_STORAGE_KEY = 'lael_guest_purchases';

/**
 * 비회원 구매 토큰 저장
 * @param {string} ebookId - 전자책 식별자 (예: 'interview', 'dandanhan')
 * @param {Object} paymentResult - 결제 결과 객체
 */
function saveGuestPurchase(ebookId, paymentResult) {
  try {
    const stored = JSON.parse(localStorage.getItem(GUEST_PURCHASE_STORAGE_KEY) || '{}');
    stored[ebookId] = {
      paid: true,
      orderId: paymentResult.orderId,
      amount: paymentResult.amount,
      paidAt: paymentResult.paidAt || new Date().toISOString(),
      buyerName: paymentResult.buyerName || '비회원',
      buyerEmail: paymentResult.buyerEmail || '',
      buyerTel: paymentResult.buyerTel || ''
    };
    localStorage.setItem(GUEST_PURCHASE_STORAGE_KEY, JSON.stringify(stored));
    console.log('[GUEST] 비회원 구매 저장:', ebookId);
    return true;
  } catch (e) {
    console.error('[GUEST] 구매 정보 저장 실패:', e);
    return false;
  }
}

/**
 * 비회원 구매 여부 확인
 * @param {string} ebookId - 전자책 식별자
 * @returns {Object|null} 구매 정보 또는 null
 */
function checkGuestPurchase(ebookId) {
  try {
    const stored = JSON.parse(localStorage.getItem(GUEST_PURCHASE_STORAGE_KEY) || '{}');
    const info = stored[ebookId];
    if (info && info.paid === true) return info;
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * 비회원(게스트) 구매 플로우 (스토어 페이지에서 호출)
 * @param {Object} opts - { ebookId, goodsName, amount, readerUrl }
 */
function requestGuestPurchase(opts) {
  const ebookId   = opts.ebookId   || 'unknown';
  const goodsName = opts.goodsName || '전자책';
  const amount    = opts.amount    || 0;
  const readerUrl = opts.readerUrl || '/';

  // 이미 구매한 경우
  const existing = checkGuestPurchase(ebookId);
  if (existing) {
    if (confirm(`이미 구매하신 상품입니다.\n\n열람 페이지로 이동하시겠습니까?`)) {
      location.href = readerUrl;
    }
    return;
  }

  // 구매자 정보 입력 모달 생성
  showGuestCheckoutModal({
    ebookId, goodsName, amount, readerUrl
  });
}

/**
 * 비회원 구매자 정보 입력 모달
 */
function showGuestCheckoutModal(opts) {
  // 기존 모달 제거
  const old = document.getElementById('guestCheckoutOverlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'guestCheckoutOverlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:rgba(0,0,0,.6);backdrop-filter:blur(6px);
    display:flex;align-items:center;justify-content:center;padding:20px;
  `;

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:24px;padding:36px 28px;max-width:400px;width:100%;box-shadow:0 30px 80px rgba(0,0,0,.4);text-align:center;font-family:'Noto Sans KR',sans-serif">
      <div style="width:64px;height:64px;border-radius:16px;background:#f0eeff;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px">🛒</div>
      <h2 style="font-size:18px;font-weight:900;color:#111;margin-bottom:6px">비회원 구매</h2>
      <p style="font-size:13px;color:#888;margin-bottom:4px">${opts.goodsName}</p>
      <p style="font-size:22px;font-weight:900;color:#4c37ce;margin-bottom:20px">${Number(opts.amount).toLocaleString('ko-KR')}원</p>

      <div style="text-align:left;display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
        <div>
          <label style="font-size:12px;font-weight:700;color:#555;margin-bottom:4px;display:block">구매자 이름 <span style="color:#e74c3c">*</span></label>
          <input id="guestName" type="text" placeholder="이름" style="width:100%;padding:12px 14px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:14px;font-family:inherit;outline:none;transition:.2s" onfocus="this.style.borderColor='#4c37ce'" onblur="this.style.borderColor='#e0e0e0'">
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#555;margin-bottom:4px;display:block">이메일 <span style="color:#e74c3c">*</span></label>
          <input id="guestEmail" type="email" placeholder="email@example.com" style="width:100%;padding:12px 14px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:14px;font-family:inherit;outline:none;transition:.2s" onfocus="this.style.borderColor='#4c37ce'" onblur="this.style.borderColor='#e0e0e0'">
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#555;margin-bottom:4px;display:block">연락처 <span style="color:#e74c3c">*</span></label>
          <input id="guestTel" type="tel" placeholder="010-0000-0000" style="width:100%;padding:12px 14px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:14px;font-family:inherit;outline:none;transition:.2s" onfocus="this.style.borderColor='#4c37ce'" onblur="this.style.borderColor='#e0e0e0'">
        </div>
      </div>

      <p style="font-size:11px;color:#b45309;background:#fff8f0;border:1px solid #ffe0c0;border-radius:8px;padding:10px 12px;margin-bottom:16px;line-height:1.6;text-align:left">
        ⚠️ 비회원 구매 시 <strong>현재 기기·브라우저</strong>에서만 열람 가능합니다.
        브라우저 데이터를 삭제하면 열람 권한이 사라질 수 있으니,
        장기 이용을 원하시면 <strong>회원가입 후 구매</strong>를 권장합니다.
      </p>

      <button id="guestPayBtn" style="width:100%;background:#4c37ce;color:#fff;border:none;border-radius:50px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:8px;font-family:inherit;transition:.2s"
        onmouseover="this.style.background='#3d2bb0'" onmouseout="this.style.background='#4c37ce'">
        결제하기
      </button>
      <button id="guestCancelBtn" style="width:100%;background:#f3f4f6;color:#555;border:none;border-radius:50px;padding:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:.2s"
        onmouseover="this.style.background='#e8e9eb'" onmouseout="this.style.background='#f3f4f6'">
        취소
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  // 취소 버튼
  document.getElementById('guestCancelBtn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  // 결제 버튼
  document.getElementById('guestPayBtn').addEventListener('click', () => {
    const name  = document.getElementById('guestName').value.trim();
    const email = document.getElementById('guestEmail').value.trim();
    const tel   = document.getElementById('guestTel').value.trim();

    if (!name) { alert('구매자 이름을 입력해 주세요.'); return; }
    if (!email || !email.includes('@')) { alert('이메일을 올바르게 입력해 주세요.'); return; }
    if (!tel) { alert('연락처를 입력해 주세요.'); return; }

    overlay.remove();

    // 토스페이먼츠 결제 요청
    requestTossPayment({
      goodsName:  opts.goodsName,
      amount:     opts.amount,
      buyerName:  name,
      buyerEmail: email,
      buyerTel:   tel,
      ebookId:    opts.ebookId,
      readerUrl:  opts.readerUrl,
      isGuest:    true
    });
  });
}

// ============================================================
// 토스페이먼츠 결제 요청
// ============================================================

/**
 * 상품명 → productId 매핑 (서버사이드 가격 검증용)
 * create-order API에서 이 productId로 정확한 가격을 조회합니다.
 */
function resolveProductId(goodsName, amount) {
  const name = (goodsName || '').toLowerCase();
  if (name.includes('패키지') || name.includes('올인원')) return 'package';
  if (name.includes('특강'))                              return 'class';
  if (name.includes('단단한') || name.includes('엄마'))    return 'ebook-mom';
  if (name.includes('vod') || name.includes('VOD') || name.includes('강의')) return 'vod';
  if (name.includes('전자책') || name.includes('ebook'))   return 'ebook';
  // amount 기반 fallback
  if (amount === 299000) return 'package';
  if (amount === 149000) return 'vod';
  if (amount === 79000)  return 'ebook';
  return 'ebook'; // 기본값
}

/**
 * 토스페이먼츠 결제 요청
 * [Critical §2.2] 서버에서 주문을 생성하여 금액 위변조를 방지합니다.
 * @param {Object} order - { goodsName, amount, buyerName, buyerEmail, buyerTel, ebookId, readerUrl, isGuest }
 */
async function requestTossPayment(order) {
  const goodsName  = order.goodsName  || '대입면접이 쉬워지는 스피치 공식';
  const buyerName  = order.buyerName  || '수강생';
  const buyerEmail = order.buyerEmail || '';
  const productId  = order.productId  || resolveProductId(goodsName, order.amount);

  // ─── Step 1: 서버에서 주문 생성 (금액 서명 발급) ───
  let serverOrder;
  try {
    const resp = await fetch('/api/payment/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
    serverOrder = await resp.json();
    if (!resp.ok) {
      console.error('[TOSS] 주문 생성 실패:', serverOrder);
      alert('주문 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
  } catch (e) {
    console.error('[TOSS] 주문 생성 네트워크 오류:', e);
    alert('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.');
    return;
  }

  const { orderId, amount, signature } = serverOrder;

  console.log('[TOSS] 결제 요청:', { orderId, productId, goodsName, amount, isGuest: !!order.isGuest });

  // 주문 정보를 sessionStorage에 임시 저장 (결제 성공 후 처리를 위해)
  sessionStorage.setItem('lael_pending_order', JSON.stringify({
    orderId,
    goodsName,
    amount,
    buyerName,
    buyerEmail,
    buyerTel: order.buyerTel || '',
    ebookId: order.ebookId || '',
    readerUrl: order.readerUrl || '',
    isGuest: !!order.isGuest
  }));

  try {
    const tp = await initTossPayments();
    if (!tp) {
      alert('결제 시스템을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    // ─── Step 2: customerKey 설정 (§8 규격 준수) ───
    // 비회원: 'ANONYMOUS' (토스 공식 지원값)
    // 회원: uid + 특수문자 포함 (2~300자, 특수문자 최소 1개)
    let customerKey = 'ANONYMOUS';
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.uid) {
      customerKey = currentUser.uid + '_@lael';
    }

    // ─── Step 3: 토스페이먼츠 결제창 호출 ───
    const payment = tp.payment({ customerKey });

    // 서명을 successUrl에 포함 → payment-success.html에서 confirm 시 전달
    const successUrl = window.location.origin + '/payment-success.html?sig=' + encodeURIComponent(signature);
    const failUrl    = window.location.origin + '/payment-fail.html';

    await payment.requestPayment({
      method: "CARD",
      amount: {
        currency: "KRW",
        value: amount,
      },
      orderId: orderId,
      orderName: goodsName,
      customerName: buyerName,
      customerEmail: buyerEmail,
      successUrl: successUrl,
      failUrl: failUrl,
    });
  } catch (err) {
    // 사용자가 결제창을 닫은 경우
    if (err.code === 'USER_CANCEL' || err.code === 'PAY_PROCESS_CANCELED') {
      console.log('[TOSS] 사용자가 결제를 취소했습니다.');
      if (typeof showToast === 'function') {
        showToast('결제가 취소되었습니다.', '다시 시도하시려면 구매 버튼을 눌러주세요.');
      }
    } else {
      console.error('[TOSS] 결제 오류:', err);
      if (typeof showToast === 'function') {
        showToast('결제 오류', err.message || '잠시 후 다시 시도해주세요.', 'error');
      }
    }
  }
}

// ============================================================
// 결제 성공 후 처리 (payment-success.html에서 리다이렉트 후)
// ============================================================

/**
 * URL 파라미터로 결제 성공 여부 확인
 * 페이지 로드 시 자동 실행
 */
(function checkPaymentReturn() {
  const params = new URLSearchParams(window.location.search);

  // 결제 성공 콜백 처리
  if (params.get('payment') === 'success') {
    const url = new URL(window.location.href);
    url.searchParams.delete('payment');
    url.searchParams.delete('orderId');
    window.history.replaceState({}, '', url.toString());

    const pendingOrder = JSON.parse(sessionStorage.getItem('lael_pending_order') || 'null');
    sessionStorage.removeItem('lael_pending_order');

    setTimeout(() => {
      if (typeof showToast === 'function') {
        showToast('결제가 완료되었습니다! 🎉', '이용권이 활성화되었습니다.');
      }

      if (typeof currentUser !== 'undefined' && currentUser) {
        currentUser.isPaid = true;
        if (typeof updateAuthUI === 'function') updateAuthUI(currentUser);
      }

      // 비회원 구매 시 localStorage 기록
      if (pendingOrder && pendingOrder.isGuest && pendingOrder.ebookId) {
        saveGuestPurchase(pendingOrder.ebookId, pendingOrder);
      }
    }, 500);
  }

  // 결제 실패/취소 콜백 처리
  if (params.get('payment') === 'fail') {
    const url = new URL(window.location.href);
    url.searchParams.delete('payment');
    url.searchParams.delete('message');
    url.searchParams.delete('code');
    window.history.replaceState({}, '', url.toString());

    sessionStorage.removeItem('lael_pending_order');

    setTimeout(() => {
      const message = params.get('message') || '결제가 취소되었습니다.';
      if (typeof showToast === 'function') {
        showToast('결제 실패', message);
      }
    }, 500);
  }
})();
