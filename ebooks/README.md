# 📚 LAEL LAB 전자책 폴더

## 폴더 구조

```
ebooks/
├── pdf/              ← 전자책 PDF 파일 저장
│   └── (여기에 PDF 파일을 넣으세요)
│
├── thumbnails/       ← 전자책 표지 이미지 저장
│   └── (여기에 표지 이미지를 넣으세요)
│
└── README.md         ← 이 파일
```

## 파일 네이밍 규칙

| 파일 종류 | 예시 |
|---|---|
| PDF 전자책 | `interview-formula-2027.pdf` |
| 표지 이미지 | `interview-formula-2027-thumb.png` |

## 전자책 뷰어 연동 방법

`ebook.html` 또는 `index.html` 에서 전자책 경로를 아래처럼 지정하세요:

```html
<iframe src="ebooks/pdf/파일명.pdf"></iframe>
```

또는 PDF 다운로드 링크:
```html
<a href="ebooks/pdf/파일명.pdf" download>다운로드</a>
```

## 구매자 전용 보호

Firebase Auth + Firestore `purchases` 컬렉션을 통해
결제 완료된 사용자만 PDF에 접근하도록 `script.js`에서 제어합니다.
