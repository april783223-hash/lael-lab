# LAEL LAB - 프리미엄 스피치 코칭 웹사이트

Google Stitch AI 디자인 플랫폼(`https://stitch.withgoogle.com/projects/8366816492117481123`) 기반으로 구축된 **LAEL LAB** 랜딩 페이지 웹 애플리케이션입니다.

---

## 🌟 주요 기능 및 특징

1. **디자인 100% 반영 & 커스텀 스타일**:
   - Stitch의 고해상도 디자인 시스템, 색상 토큰, 글래스모피즘 및 타이포그래피 반영
   - 반응형 디자인 (데스크톱, 태블릿, 모바일 완벽 대응)
2. **요청된 CTA 버튼 및 기능 반영**:
   - **2027 대입 면접 패키지**: **"구매"** 버튼 및 결제 안내 모달 연동
   - **오프라인 면접 특강**: **"수강신청"** 버튼 및 신청 모달 연동
   - **온라인 면접 특강**: **"수강신청"** 버튼 및 신청 모달 연동
   - **면접 무료 비법 자료집**: **"무료 다운로드"** 버튼 및 이메일 수령 모달 연동
3. **모바일 최적화**:
   - 햄버거 드로어 메뉴
   - 모바일 하단 플로팅 구매 CTA 바
4. **인터랙션 & 모달**:
   - 카테고리별 상세 커리큘럼 팝업
   - 신청/구매 시 토스트 알림 피드백 제공

---

## 📂 파일 구조

```text
lael lab/
├── .agents/
│   └── plugins/stitch/
│       ├── plugin.json        # Stitch 플러그인 정의
│       └── mcp_config.json    # Stitch MCP 서버 연결 설정 (API Key)
├── assets/
│   ├── css/
│   │   └── custom.css         # 글래스모피즘, 모달, 애니메이션 스타일
│   └── images/
│       ├── coach-profile.png  # 코치 프로필 이미지
│       ├── class-group.png    # 그룹 코칭 현장 사진
│       └── class-presentation.png # 프레젠테이션 실습 사진
├── index.html                 # 메인 웹페이지
├── script.js                  # 인터랙티브 모달 및 폼 핸들러
└── README.md
```

---

## 🚀 실행 및 미리보기 방법

1. 브라우저에서 `index.html`을 바로 열람하시거나,
2. VS Code / Antigravity IDE의 `Live Server` 확장을 통해 실시간으로 확인하실 수 있습니다.
