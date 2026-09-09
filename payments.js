// ============================================================
// LAEL LAB - 나이스페이먼츠 결제 연동 + Firestore 결제 기록 저장
// ============================================================

const NICEPAY_CONFIG = {
  clientId: "YOUR_NICEPAY_CLIENT_KEY", // 나이스페이 발급 Client Key
  mid:      "nictest00m",              // 테스트 가맹점 ID (상용 시 실 MID로 교체)
  mode:     "test"                     // 'test' | 'live'
};

/**
 * 나이스페이 결제 요청
 * @param {Object} order - { goodsName, amount, buyerName, buyerEmail, buyerTel }
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

    console.log('[NICEPAY] 결제 요청:', { orderId, goodsName, amount });

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
            showToast('결제 실패', '다시 시도해 주세요.', 'error');
            reject(err);
          }
        });
        // returnUrl 방식이므로 resolve는 서버 콜백에서 처리
      } catch (err) {
        console.warn('[NICEPAY] SDK 오류 → 시뮬레이션 전환:', err);
        simulatePayment({ orderId, goodsName, amount, buyerName, buyerEmail, buyerTel })
          .then(resolve).catch(reject);
      }
    } else {
      // 테스트/로컬 환경 시뮬레이션
      simulatePayment({ orderId, goodsName, amount, buyerName, buyerEmail, buyerTel })
        .then(resolve).catch(reject);
    }
  });
}

/**
 * 로컬 테스트용 결제 시뮬레이터
 */
function simulatePayment(order) {
  return new Promise((resolve) => {
    showToast('결제창 연결 중...', `${order.goodsName} 결제를 시작합니다.`);

    setTimeout(() => {
      const confirmed = confirm(
        `[LAEL LAB × 나이스페이]\n\n` +
        `상품: ${order.goodsName}\n` +
        `금액: ${Number(order.amount).toLocaleString('ko-KR')}원\n` +
        `구매자: ${order.buyerName}\n\n` +
        `※ 테스트 결제입니다. 실제 금액이 청구되지 않습니다.\n` +
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

        // Firestore에 결제 기록 저장 (로그인 상태인 경우)
        if (currentUser && typeof savePurchaseRecord === 'function') {
          savePurchaseRecord(currentUser.uid, result).then(() => {
            // Firestore 저장 후 currentUser.isPaid 갱신
            currentUser.isPaid = true;
          });
        } else if (currentUser) {
          // Firebase 미연결 시 localStorage fallback
          currentUser.isPaid = true;
          localStorage.setItem('lael_user', JSON.stringify(currentUser));
        }

        resolve(result);
      } else {
        showToast('결제가 취소되었습니다.', '다시 시도하시려면 구매 버튼을 눌러주세요.');
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
      showToast('결제가 완료되었습니다! 🎉', '패키지 이용권이 활성화되었습니다.');
      if (currentUser) {
        currentUser.isPaid = true;
        updateAuthUI(currentUser);
      }
    }, 500);
  }
})();
