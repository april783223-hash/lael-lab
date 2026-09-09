// ============================================================
// LAEL LAB - 메인 인터랙션 스크립트
// Firebase Auth + Firestore 구매 확인 통합
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. 모바일 메뉴 열기/닫기
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu    = document.getElementById('mobileMenu');
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  // 2. 헤더 스크롤 효과
  const header = document.getElementById('mainHeader');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('shadow-md', 'bg-surface/95');
      header.classList.remove('bg-surface/85');
    } else {
      header.classList.remove('shadow-md', 'bg-surface/95');
      header.classList.add('bg-surface/85');
    }
  });

  // 3. ESC 키로 모달 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      document.body.style.overflow = '';
    }
  });

  // 4. 모달 배경 클릭으로 닫기
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });
});

// ── 모바일 메뉴 닫기 ────────────────────────────────────────
function closeMobileMenu() {
  const m = document.getElementById('mobileMenu');
  if (m) m.classList.add('hidden');
}

// ── 모달 열기 / 닫기 ────────────────────────────────────────
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ── 전자책 / 강의실 모달 ─────────────────────────────────────
function openEbookModal() {
  if (!currentUser) {
    showToast('로그인이 필요합니다', '전자책을 보려면 먼저 로그인해주세요.');
    openModal('authModal');
    return;
  }
  openModal('ebookModal');
}

function openLectureModal() {
  if (!currentUser) {
    showToast('로그인이 필요합니다', '강의실을 이용하려면 먼저 로그인해주세요.');
    openModal('authModal');
    return;
  }
  openModal('lectureModal');
}

// ── AI 모의면접 챗봇 ─────────────────────────────────────────
async function openAIChatbot() {
  const lockedEl   = document.getElementById('chatbotLockedState');
  const unlockedEl = document.getElementById('chatbotUnlockedState');

  if (!currentUser) {
    // 비로그인 → 잠금 상태
    lockedEl?.classList.remove('hidden');
    unlockedEl?.classList.add('hidden');
    openModal('aiChatbotModal');
    return;
  }

  // 로그인 상태 → Firestore 결제 여부 확인
  const paid = await checkUserPaid(currentUser);

  if (paid) {
    lockedEl?.classList.add('hidden');
    unlockedEl?.classList.remove('hidden');
  } else {
    lockedEl?.classList.remove('hidden');
    unlockedEl?.classList.add('hidden');
  }
  openModal('aiChatbotModal');
}

// ── 동영상 재생 ──────────────────────────────────────────────
function playLecture(title, videoUrl) {
  const titleEl  = document.getElementById('currentLectureTitle');
  const iframeEl = document.getElementById('videoIframe');
  if (titleEl) titleEl.textContent = '🎥 ' + title;
  if (iframeEl) {
    const sep = videoUrl.includes('?') ? '&' : '?';
    if (videoUrl.includes('vimeo.com')) {
      iframeEl.src = videoUrl + sep + 'title=0&byline=0&portrait=0&badge=0&color=4c37ce&autoplay=1';
    } else {
      iframeEl.src = videoUrl + (videoUrl.includes('?') ? '' : '?rel=0&modestbranding=1&autoplay=1');
    }
  }
  document.querySelectorAll('.lecture-item').forEach(item => {
    item.classList.remove('active', 'bg-primary/20', 'border-primary/40');
    item.classList.add('bg-gray-800/60');
  });
  if (window.event?.currentTarget) {
    window.event.currentTarget.classList.add('active', 'bg-primary/20', 'border-primary/40');
    window.event.currentTarget.classList.remove('bg-gray-800/60');
  }
}

function changeCustomVideo() {
  const input  = document.getElementById('customVideoInput');
  const iframe = document.getElementById('videoIframe');
  if (!input || !iframe || !input.value.trim()) return;
  let val = input.value.trim(), url = '';
  if (val.includes('vimeo.com/video/')) {
    const id = val.split('video/')[1].split('?')[0].split('/')[0];
    url = `https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0&badge=0&color=4c37ce&autoplay=1`;
  } else if (val.includes('vimeo.com/')) {
    const id = val.split('vimeo.com/')[1].split('?')[0].split('/')[0];
    url = `https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0&badge=0&color=4c37ce&autoplay=1`;
  } else if (/^\d+$/.test(val)) {
    url = `https://player.vimeo.com/video/${val}?title=0&byline=0&portrait=0&badge=0&color=4c37ce&autoplay=1`;
  } else if (val.includes('youtube.com/watch?v=')) {
    const id = val.split('v=')[1].split('&')[0];
    url = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&autoplay=1`;
  } else if (val.includes('youtu.be/')) {
    const id = val.split('youtu.be/')[1].split('?')[0];
    url = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&autoplay=1`;
  } else {
    url = `https://player.vimeo.com/video/${val}?title=0&byline=0&portrait=0&badge=0&color=4c37ce&autoplay=1`;
  }
  iframe.src = url;
  showToast('영상이 변경되었습니다!', '클린 플레이어로 즉시 재생됩니다.');
}

// ── 카테고리 모달 ────────────────────────────────────────────
function openCategoryModal(title, desc, icon) {
  const catTitle = document.getElementById('catTitle');
  const catDesc  = document.getElementById('catDesc');
  const catIcon  = document.getElementById('catIcon');
  if (catTitle) catTitle.textContent = title;
  if (catDesc)  catDesc.textContent  = desc;
  if (catIcon)  catIcon.textContent  = icon;
  openModal('categoryModal');
}

// ============================================================
// Firebase Authentication
// ============================================================
let currentUser        = null;
let isSignUpMode       = false;
let pendingAfterLogin  = null; // 로그인 후 실행할 콜백

// 로그인 후 챗봇 열기 (잠금 화면의 "로그인하고 이용하기" 버튼 전용)
function loginThenOpenChatbot() {
  pendingAfterLogin = () => openAIChatbot();
  closeModal('aiChatbotModal');
  openModal('authModal');
}

// ── 사용자 결제 여부 확인 (Firestore + localStorage fallback) ──
async function checkUserPaid(user) {
  if (!user) return false;

  // Firestore 연결 시 실제 DB 확인
  if (typeof checkPurchaseStatus === 'function' && user.uid) {
    try {
      const paid = await checkPurchaseStatus(user.uid);
      // localStorage에도 동기화
      if (paid) {
        user.isPaid = true;
        localStorage.setItem('lael_user', JSON.stringify(user));
      }
      return paid;
    } catch (e) { /* fallback */ }
  }

  // localStorage fallback (로컬 테스트 모드)
  return user.isPaid === true;
}

// ── Auth 상태 감지 ───────────────────────────────────────────
if (typeof auth !== 'undefined' && auth) {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      // Firestore에 사용자 문서 생성/갱신
      if (typeof upsertUserDoc === 'function') {
        await upsertUserDoc(user);
      }
      // 결제 여부 확인 후 UI 업데이트
      const paid = await checkUserPaid(user);
      user.isPaid = paid;
      currentUser = user;
    } else {
      currentUser = null;
    }
    updateAuthUI(currentUser);
  });
} else {
  // 로컬 테스트 모드: localStorage 확인
  const saved = localStorage.getItem('lael_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      updateAuthUI(currentUser);
    } catch(e) {}
  }
}

// ── 로그인 / 회원가입 전환 ────────────────────────────────────
function toggleAuthMode() {
  isSignUpMode = !isSignUpMode;
  const title       = document.getElementById('authModalTitle');
  const submitBtn   = document.getElementById('authSubmitBtn');
  const togglePrompt = document.getElementById('authTogglePrompt');
  const toggleBtn   = document.getElementById('authToggleBtn');

  if (isSignUpMode) {
    if (title)        title.textContent       = '수강생 회원가입';
    if (submitBtn)    submitBtn.textContent    = '회원가입 완료';
    if (togglePrompt) togglePrompt.textContent = '이미 계정이 있으신가요?';
    if (toggleBtn)    toggleBtn.textContent    = '로그인하기';
  } else {
    if (title)        title.textContent       = '수강생 로그인';
    if (submitBtn)    submitBtn.textContent    = '로그인';
    if (togglePrompt) togglePrompt.textContent = '아직 회원이 아니신가요?';
    if (toggleBtn)    toggleBtn.textContent    = '회원가입하기';
  }
}

// ── Google 로그인 ─────────────────────────────────────────────
async function handleGoogleSignIn() {
  if (typeof auth !== 'undefined' && auth) {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ login_hint: 'april783223@gmail.com' });
    try {
      const res = await auth.signInWithPopup(provider);
      currentUser = res.user;
      closeModal('authModal');
      showToast('로그인 성공! 👋', `${currentUser.displayName || '수강생'}님 환영합니다.`);
      // 로그인 후 대기 중인 액션 실행 (예: 챗봇 열기)
      if (pendingAfterLogin) {
        const cb = pendingAfterLogin;
        pendingAfterLogin = null;
        setTimeout(cb, 300);
      }
    } catch (err) {
      console.error('[Auth] Google 로그인 오류:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        showToast('로그인 실패', '다시 시도해주세요.');
      }
    }
  } else {
    // 로컬 데모 모드
    currentUser = { uid: 'demo_uid', displayName: '홍길동', email: 'student@gmail.com', isPaid: true };
    localStorage.setItem('lael_user', JSON.stringify(currentUser));
    closeModal('authModal');
    showToast('로그인 성공 (테스트 모드)', '홍길동님 환영합니다.');
    updateAuthUI(currentUser);
  }
}

// ── 이메일/비밀번호 로그인 ────────────────────────────────────
async function handleEmailAuth(event) {
  event.preventDefault();
  const email    = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const submitBtn = document.getElementById('authSubmitBtn');

  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '처리 중...'; }

  if (typeof auth !== 'undefined' && auth) {
    try {
      let res;
      if (isSignUpMode) {
        res = await auth.createUserWithEmailAndPassword(email, password);
        // 회원가입 시 displayName 설정 (이메일 앞부분)
        await res.user.updateProfile({ displayName: email.split('@')[0] });
        showToast('회원가입 완료! 🎉', '가입이 정상 처리되었습니다.');
      } else {
        res = await auth.signInWithEmailAndPassword(email, password);
        showToast('로그인 성공! 👋', `${email}님 환영합니다.`);
      }
      currentUser = res.user;
      closeModal('authModal');
      // 로그인 후 대기 중인 액션 실행
      if (pendingAfterLogin) {
        const cb = pendingAfterLogin;
        pendingAfterLogin = null;
        setTimeout(cb, 300);
      }
    } catch (err) {
      console.error('[Auth] 이메일 인증 오류:', err);
      const msg = {
        'auth/user-not-found':    '등록되지 않은 이메일입니다.',
        'auth/wrong-password':    '비밀번호가 올바르지 않습니다.',
        'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
        'auth/weak-password':     '비밀번호는 6자 이상이어야 합니다.',
        'auth/invalid-email':     '올바른 이메일 형식을 입력해주세요.'
      }[err.code] || '오류가 발생했습니다. 다시 시도해주세요.';
      showToast('인증 오류', msg);
    }
  } else {
    // 로컬 데모 모드
    currentUser = { uid: 'demo_' + Date.now(), displayName: email.split('@')[0], email, isPaid: true };
    localStorage.setItem('lael_user', JSON.stringify(currentUser));
    closeModal('authModal');
    showToast('로그인 성공 (테스트 모드)', `${currentUser.displayName}님 환영합니다.`);
    updateAuthUI(currentUser);
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = isSignUpMode ? '회원가입 완료' : '로그인';
  }
}

// ── 로그아웃 ─────────────────────────────────────────────────
function handleSignOut() {
  if (typeof auth !== 'undefined' && auth) auth.signOut();
  currentUser = null;
  localStorage.removeItem('lael_user');
  updateAuthUI(null);
  showToast('로그아웃 되었습니다.', '언제든 다시 로그인해 주세요.');
}

// ── Auth 상태에 따른 UI 업데이트 ──────────────────────────────
function updateAuthUI(user) {
  const authNav        = document.getElementById('authNavContainer');
  const mobileAuthText = document.getElementById('mobileAuthText');

  if (user) {
    const name   = user.displayName || (user.email ? user.email.split('@')[0] : '수강생');
    const isPaid = user.isPaid === true;

    if (authNav) {
      authNav.innerHTML = `
        <div class="relative group">
          <button class="bg-primary/10 text-primary px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border border-primary/30 shadow-sm cursor-pointer">
            <span class="w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-400'}"></span>
            <span>${name} 님</span>
            <span class="text-[10px] ${isPaid ? 'bg-primary' : 'bg-yellow-500'} text-white px-1.5 py-0.5 rounded font-semibold">${isPaid ? '수강중' : '미결제'}</span>
          </button>
          <div class="hidden group-hover:block absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 p-2 w-36 z-50">
            <button onclick="openEbookModal()" class="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg">📖 내 전자책</button>
            <button onclick="openLectureModal()" class="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg">🎥 내 강의실</button>
            <button onclick="openAIChatbot()" class="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg">🤖 AI 모의면접</button>
            <hr class="my-1 border-gray-100">
            <button onclick="handleSignOut()" class="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg font-semibold">로그아웃</button>
          </div>
        </div>
      `;
    }
    if (mobileAuthText) {
      mobileAuthText.innerHTML = `<span>${name}님 (${isPaid ? '✅ 수강중' : '⚠️ 미결제'})</span> • <span class="text-xs text-red-500 underline cursor-pointer" onclick="handleSignOut(); event.stopPropagation();">로그아웃</span>`;
    }
  } else {
    if (authNav) {
      authNav.innerHTML = `
        <button onclick="openModal('authModal')" class="text-on-surface hover:text-primary px-3.5 py-2 rounded-full text-xs font-bold border border-outline-variant/60 hover:border-primary transition-all flex items-center gap-1.5 bg-white shadow-sm">
          <span class="material-symbols-outlined text-sm">person</span>
          <span>로그인</span>
        </button>
      `;
    }
    if (mobileAuthText) mobileAuthText.textContent = '로그인 / 회원가입';
  }
}

// ============================================================
// 결제 플로우
// ============================================================

// 결제 모달 열기 (구매 버튼 클릭 시)
function openPurchaseModal(goodsName, amount) {
  const titleEl = document.getElementById('purchaseItemTitle');
  const priceEl = document.getElementById('purchaseItemPrice');
  if (titleEl) titleEl.textContent = goodsName;
  if (priceEl) priceEl.textContent = Number(amount).toLocaleString('ko-KR') + '원';
  openModal('purchaseModal');
}

// 구매 폼 제출 → 나이스페이 결제 요청
async function handlePurchaseSubmit(event) {
  event.preventDefault();
  const name  = document.getElementById('purchaserName')?.value;
  const phone = document.getElementById('purchaserPhone')?.value;
  const email = document.getElementById('purchaserEmail')?.value;
  const note  = document.getElementById('purchaserNote')?.value || '';

  const goodsName = document.getElementById('purchaseItemTitle')?.textContent || '2027 대입 면접 올인원 패키지';
  const amount    = 99000;

  closeModal('purchaseModal');

  try {
    const result = await requestNicePay({
      goodsName,
      amount,
      buyerName:  name,
      buyerEmail: email || (currentUser?.email || ''),
      buyerTel:   phone,
      note
    });

    if (result?.success) {
      // currentUser에 결제 플래그 설정
      if (currentUser) {
        currentUser.isPaid = true;
        localStorage.setItem('lael_user', JSON.stringify(currentUser));
        updateAuthUI(currentUser);
      }
      showToast('결제 완료! 🎉', '패키지 이용권이 활성화되었습니다. AI 챗봇과 강의실을 이용하세요!');
      setTimeout(() => openLectureModal(), 1200);
    }
  } catch (err) {
    console.error('[결제] 오류:', err);
  }
}

// 통합 결제 플로우 (헤더 구매 버튼용)
async function openPurchaseFlow(goodsName = '2027 대입 면접 올인원 패키지', amount = 99000) {
  if (!currentUser) {
    showToast('로그인이 필요합니다', '결제 전 로그인해주세요.');
    openModal('authModal');
    return;
  }
  openPurchaseModal(goodsName, amount);
}

// ── 수강신청 모달 ────────────────────────────────────────────
function openCourseModal(courseTitle) {
  const titleEl = document.getElementById('courseModalTitle');
  if (titleEl) titleEl.textContent = courseTitle;
  openModal('courseModal');
}

function handleCourseSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('applicantName').value;
  closeModal('courseModal');
  showToast('수강신청 접수 완료! ✅', `${name}님, 담당자가 빠르게 연락드리겠습니다.`);
  event.target.reset();
}

function handleFreeResourceSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('freeEmail').value;
  closeModal('freeResourceModal');
  showToast('자료 발송 완료! 📧', `${email} 메일함으로 비법 가이드 PDF를 보내드렸습니다.`);
  event.target.reset();
}

// ── 토스트 알림 ──────────────────────────────────────────────
function showToast(title, message, type = 'success') {
  const toast   = document.getElementById('toast');
  const tTitle  = document.getElementById('toastTitle');
  const tMsg    = document.getElementById('toastMessage');
  const tIcon   = document.getElementById('toastIcon');

  if (!toast) return;
  if (tTitle) tTitle.textContent = title;
  if (tMsg)   tMsg.textContent   = message;
  if (tIcon)  tIcon.textContent  = type === 'error' ? 'error' : 'check_circle';
  if (tIcon)  tIcon.className    = `material-symbols-outlined text-2xl ${type === 'error' ? 'text-red-400' : 'text-emerald-400'}`;

  toast.classList.remove('translate-y-[-100px]', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-[-100px]', 'opacity-0');
  }, 4500);
}
