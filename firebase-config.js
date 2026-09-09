// ============================================================
// LAEL LAB - Firebase 초기화 (Auth + Firestore)
// ============================================================
// ⚠️ 아래 YOUR_로 시작하는 값들을 Firebase 콘솔에서 복사한
//    실제 값으로 교체하세요:
//    Firebase Console → 프로젝트 설정 → 내 앱 → SDK 설정 및 구성
// ============================================================

const firebaseConfig = {
  apiKey:            "AIzaSyAsWYeS44uDurvAzIKiED3_6i-2csumDd8",
  authDomain:        "laellab.firebaseapp.com",
  projectId:         "laellab",
  storageBucket:     "laellab.firebasestorage.app",
  messagingSenderId: "765549895319",
  appId:             "1:765549895319:web:969c6b7cafc5a18c81d3d2",
  measurementId:     "G-9E1Q7GEW03"
};

// ── Firebase 초기화 ─────────────────────────────────────────
let auth = null;
let db   = null;

try {
  if (typeof firebase !== 'undefined') {
    // 중복 초기화 방지
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    db   = firebase.firestore();

    // 한국어 로케일 (Google 로그인 팝업)
    auth.languageCode = 'ko';

    console.log('[LAEL LAB] Firebase 초기화 성공 ✅');
  }
} catch (e) {
  console.warn('[LAEL LAB] Firebase 미연결 → 로컬 테스트 모드로 실행됩니다.', e.message);
}

// ============================================================
// Firestore 데이터 구조
// ============================================================
// users/{uid}
//   displayName : string
//   email       : string
//   createdAt   : Timestamp
//   photoURL    : string | null
//
// purchases/{uid}
//   paid        : boolean
//   orderId     : string
//   goodsName   : string
//   amount      : number
//   paidAt      : Timestamp
//   tid         : string   (나이스페이 거래 ID)
// ============================================================

/**
 * 사용자 문서 생성/갱신 (로그인 시 자동 호출)
 */
async function upsertUserDoc(user) {
  if (!db || !user) return;
  try {
    const ref = db.collection('users').doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({
        displayName: user.displayName || user.email.split('@')[0],
        email: user.email,
        photoURL: user.photoURL || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (e) {
    console.warn('[LAEL LAB] upsertUserDoc 오류:', e.message);
  }
}

/**
 * 결제 여부 확인 (Firestore)
 * @returns {Promise<boolean>}
 */
async function checkPurchaseStatus(uid) {
  if (!db || !uid) return false;
  try {
    const snap = await db.collection('purchases').doc(uid).get();
    return snap.exists && snap.data().paid === true;
  } catch (e) {
    console.warn('[LAEL LAB] checkPurchaseStatus 오류:', e.message);
    return false;
  }
}

/**
 * 결제 기록 저장 (나이스페이 승인 후 호출)
 * @param {string} uid
 * @param {object} paymentResult
 */
async function savePurchaseRecord(uid, paymentResult) {
  if (!db || !uid) return;
  try {
    await db.collection('purchases').doc(uid).set({
      paid:      true,
      orderId:   paymentResult.orderId,
      goodsName: paymentResult.goodsName,
      amount:    paymentResult.amount,
      tid:       paymentResult.tid || '',
      paidAt:    firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('[LAEL LAB] 결제 기록 저장 완료 ✅', paymentResult.orderId);
  } catch (e) {
    console.warn('[LAEL LAB] savePurchaseRecord 오류:', e.message);
  }
}
