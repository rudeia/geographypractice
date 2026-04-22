# 세계시민과 지리 학습지 (v16)

안좌고등학교 사회과 제작 — 세계시민과 지리 4개 단원 학습지 웹앱.

## 기능
- **학습**: 중단원 → 소단원 → 세부내용 탐색하며 학습지 전체 복습
- **랜덤 학습**: 중단원 내에서 N개 랜덤 출제 후 결과 확인
- **타임어택**: 제한 시간 내 빈칸 맞히기 (+10 / −5, 최소 0점)

## 구조
```
site/
├── index.html
├── README.md
├── css/styles.css
├── js/app.js
└── data/data.json
```

## 로컬 실행
```
cd site
python -m http.server 8080
# http://localhost:8080
```

## 배포 (Cloudflare Pages)
1. GitHub 저장소 생성 후 `site/` 내용 업로드
2. Cloudflare Pages → Create project → Connect Git
3. Build command: (없음) / Output directory: `/`

## v16 변경점
- 입력칸 너비를 정답 글자수에 맞게 자동 설정 (em 단위)
- 정답 입력 시 확대/shake 애니메이션 완전 제거 (색상만 변경)
- 체크마크(✓)는 입력칸 내부 절대위치 → 레이아웃 불변
- 세부내용 들여쓰기 강화 (level-item 2.2em / level-dash 3.8em)
- 모바일 버튼 한 줄 배치 (이전 / 다음 / 확인 / 정답)
- 제목 한 줄 처리 (clamp + ellipsis)

제작 : 안좌고등학교 사회과
