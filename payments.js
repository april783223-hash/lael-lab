// ============================================================
// LAEL LAB - 나이스페이먼츠 결제 연동 + Firestore 결제 기록 저장
// ============================================================

const NICEPAY_CONFIG = {
  clientId: "YOUR_NICEPAY_CLIENT_KEY", // 나이스페이 발급 Client Key
  mid:      "nictest00m",              // 테스트 가맹점 ID (상용 시 실 MID로 교체)
  mode:     "test"                     // 'test' | 'live'
};

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
      tid: paymentResult.tid,
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
 * 비회원 구매 결제 플로우 (스토어 페이지에서 호출)
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

    // 나이스페이 결제 요청
    requestNicePay({
      goodsName:  opts.goodsName,
      amount:     opts.amount,
      buyerName:  name,
      buyerEmail: email,
      buyerTel:   tel,
      ebookId:    opts.ebookId,
      readerUrl:  opts.readerUrl,
      isGuest:    true
    }).then(result => {
      if (result && result.success) {
        // 비회원 구매 토큰 저장
        result.buyerName  = name;
        result.buyerEmail = email;
        result.buyerTel   = tel;
        saveGuestPurchase(opts.ebookId, result);

        // 결제 완료 → 열람 페이지로 이동
        setTimeout(() => {
          if (confirm('결제가 완료되었습니다! 🎉\n\n지금 바로 전자책을 열람하시겠습니까?')) {
            location.href = opts.readerUrl;
          }
        }, 300);
      }
    }).catch(err => {
      console.error('[GUEST] 결제 실패:', err);
    });
  });
}

/**
 * 나이스페이 결제 요청
 * @param {Object} order - { goodsName, amount, buyerName, buyerEmail, buyerTel, ebookId, readerUrl, isGuest }
 * @returns {Promise<Object>} paymentResult
 */
function requestNicePay(order) {
  return new Promise((resolve, reject) => {
    const orderId    = 'ORD_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const amount     = order.amount     || 99000;
    const goodsName  = order.goodsName  || '2027 대입 면접 올인원 패키지';
    const buyerName  = order.buyerName  || '수강생';
    const buyerEmail = order.buyerEmail || 'student@example.com';
    const buyerTel   = order.buyerTel   || '010-0000-0000';

    console.log('[NICEPAY] 결제 요청:', { orderId, goodsName, amount, isGuest: !!order.isGuest });

    // 실제 나이스페이 SDK가 로드된 경우
    if (typeof AUTHNICE !== 'undefined' && NICEPAY_CONFIG.clientId !== 'YOUR_NICEPAY_CLIENT_KEY') {
      try {
        AUTHNICE.requestPay({
          clientId:   NICEPAY_CONFIG.clientId,
          method:     'card',
          orderId:    orderId,
          amount:     amount,
          goodsName:  goodsName,
          buyerName:  buyerName,
          buyerEmail: buyerEmail,
          buyerTel:   buyerTel,
          returnUrl:  window.location.origin + '/index.html?payment=success',
          fnError: function(err) {
            console.error('[NICEPAY] 결제 오류:', err);
            if (typeof showToast === 'function') showToast('결제 실패', '다시 시도해 주세요.', 'error');
            reject(err);
          }
        });
        // returnUrl 방식이므로 resolve는 서버 콜백에서 처리
      } catch (err) {
        console.warn('[NICEPAY] SDK 오류 → 시뮬레이션 전환:', err);
        simulatePayment({ orderId, goodsName, amount, buyerName, buyerEmail, buyerTel, isGuest: order.isGuest, ebookId: order.ebookId })
          .then(resolve).catch(reject);
      }
    } else {
      // 테스트/로컬 환경 시뮬레이션
      simulatePayment({ orderId, goodsName, amount, buyerName, buyerEmail, buyerTel, isGuest: order.isGuest, ebookId: order.ebookId })
        .then(resolve).catch(reject);
    }
  });
}

/**
 * 로컬 테스트용 결제 시뮬레이터
 */
function simulatePayment(order) {
  return new Promise((resolve) => {
    if (typeof showToast === 'function') showToast('결제창 연결 중...', `${order.goodsName} 결제를 시작합니다.`);

    setTimeout(() => {
      const confirmed = confirm(
        `[LAEL LAB × 나이스페이]\n\n` +
        `상품: ${order.goodsName}\n` +
        `금액: ${Number(order.amount).toLocaleString('ko-KR')}원\n` +
        `구매자: ${order.buyerName}\n` +
        (order.isGuest ? `구매 유형: 비회원 구매\n` : '') +
        `\n※ 테스트 결제입니다. 실제 금액이 청구되지 않습니다.\n` +
        `결제를 진행하시겠습니까?`
      );

      if (confirmed) {
        const result = {
          success:   true,
          tid:       'NICE_' + Math.random().toString(36).slice(2, 10).toUpperCase(),
          orderId:   order.orderId,
          amount:    order.amount,
          goodsName: order.goodsName,
          paidAt:    new Date().toISOString(),
          pg:        'NICEPAY'
        };

        if (order.isGuest) {
          // 비회원 구매 → localStorage에 저장 (requestGuestPurchase에서 처리)
          console.log('[NICEPAY] 비회원 결제 완료');
        } else if (typeof currentUser !== 'undefined' && currentUser && typeof savePurchaseRecord === 'function') {
          // Firestore에 결제 기록 저장 (로그인 상태인 경우)
          savePurchaseRecord(currentUser.uid, result).then(() => {
            // Firestore 저장 후 currentUser.isPaid 갱신
            currentUser.isPaid = true;
          });
        } else if (typeof currentUser !== 'undefined' && currentUser) {
          // Firebase 미연결 시 localStorage fallback
          currentUser.isPaid = true;
          localStorage.setItem('lael_user', JSON.stringify(currentUser));
        }

        resolve(result);
      } else {
        if (typeof showToast === 'function') showToast('결제가 취소되었습니다.', '다시 시도하시려면 구매 버튼을 눌러주세요.');
      }
    }, 700);
  });
}

/**
 * URL 파라미터로 결제 성공 여부 확인 (returnUrl 방식)
 * 페이지 로드 시 자동 실행
 */
(function checkPaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'success') {
    // URL 파라미터 정리
    const url = new URL(window.location.href);
    url.searchParams.delete('payment');
    window.history.replaceState({}, '', url.toString());

    // 결제 성공 처리 (서버에서 검증 후 Firestore 업데이트 필요 - 상용 시)
    setTimeout(() => {
      if (typeof showToast === 'function') showToast('결제가 완료되었습니다! 🎉', '패키지 이용권이 활성화되었습니다.');
      if (typeof currentUser !== 'undefined' && currentUser) {
        currentUser.isPaid = true;
        if (typeof updateAuthUI === 'function') updateAuthUI(currentUser);
      }
    }, 500);
  }
})();
