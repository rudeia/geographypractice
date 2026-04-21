# 세계시민과 지리 학습지

안좌고등학교 사회과 제작 · 고등학교 「세계시민과 지리」 단원 학습용 웹 학습지

## 기능
- **학습 탭**: 중단원 → 소단원 → 세부내용 순서대로 빈칸 채우기 학습
- **랜덤 학습 탭**: 선택한 중단원에서 세부내용 N개를 랜덤 추출하여 세트 학습 후 결과 확인
- **타임어택 탭**: 제한시간 내 맞힌 빈칸 수로 점수 집계 (+10/-5, 최소 0)
- 공백·중간점(·)·하이픈 무시 정답 인정 (예: `국제 연합` = `국제연합`)
- 칠판 테마 UI

## 폴더 구조
```
site/
├── index.html
├── README.md
├── css/
│   └── styles.css
├── js/
│   └── app.js
└── data/
    └── data.json
```

## 로컬 실행
```bash
cd site
python -m http.server 8080
# 브라우저에서 http://localhost:8080 접속
```

## 배포 (Cloudflare Pages)
1. 본 `site/` 폴더의 내용을 GitHub 저장소에 push
2. Cloudflare Pages → Create a project → GitHub 저장소 연결
3. Build 설정은 비워둔 채 **Output directory: `/`** 로 지정 후 배포

## 크레딧
제작 : 안좌고등학교 사회과
