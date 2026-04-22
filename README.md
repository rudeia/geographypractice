# 세계시민과 지리 · 학습지 웹앱 (v19)

안좌고등학교 사회과 · 세계시민과 지리 교과서 기반의 빈칸 학습 웹사이트.

## 🎯 기능
- **학습**: 중단원 → 소단원 → 세부내용을 순서대로 학습하며 빈칸 채우기
- **랜덤 학습**: 선택한 중단원에서 랜덤하게 N문항 출제 → 결과 요약
- **타임어택**: 제한 시간 내 최대한 많은 빈칸 정답 맞히기 (정답 +10 / 오답 −5)

## 📁 폴더 구조
```
site/
├── index.html
├── README.md
├── css/styles.css
├── js/app.js
└── data/data.json
```

## 🖥 로컬 실행
```bash
python -m http.server 8080
# → http://localhost:8080
```

## ☁️ Cloudflare Pages 배포
1. 이 폴더를 GitHub 리포지토리에 업로드
2. Cloudflare Pages → "Connect to Git" → 레포 선택
3. Build command: (비워두기), Output directory: `/` (또는 site)
4. Deploy

## 🎨 디자인
- **전역 UI**: 아이보리 종이 지도 + 딥블루/에메랄드/테라코타 "세계시민과 지리" 테마
- **콘텐츠 영역(.board)**: 녹색 칠판 + 갈색 프레임 + 분필 글씨
- **모바일 최적화**: 16px 입력폰트(iOS 확대 방지) / 1줄 버튼 / 제목 clamp

## 🔧 v19 수정사항
- 비활성 빈칸: 점선/반투명 제거 → 단순 노란 밑줄로 정리 (정답 스포일러 완전 차단)
- 입력칸 너비: em → **px 고정** + `overflow:hidden` + `contain:layout` → IME 입력 중 줄 이탈 완전 차단
- 모든 blank 관련 opacity 제거 (반투명 글씨 완전 제거)
- `-webkit-text-fill-color` 명시로 iOS 글자 흐림 차단
- 모바일도 input 폰트 16px 유지 (안정성 최우선)

제작 : 안좌고등학교 사회과
