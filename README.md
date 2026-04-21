# 세계시민과 지리 — 빈칸 학습 사이트

## 구조
```
site/
├── index.html
├── css/style.css
├── js/app.js
└── data/units.json
```

## 로컬 실행
```bash
python -m http.server 8080
# http://localhost:8080 접속
```

## Cloudflare Pages 배포
1. GitHub 저장소에 site/ 폴더 내용을 업로드
2. Cloudflare → Workers & Pages → Create → Pages → Connect to Git
3. Build command: (비움)
4. Output directory: `/`
5. Deploy

제작 : 안좌고등학교 사회과
