# 세계시민과 지리 - 빈칸 학습 (v7)

## 실행
```bash
cd site
python -m http.server 8080
# → http://localhost:8080
```

## 배포 (Cloudflare Pages)
1. GitHub 저장소 생성 → `site` 폴더 내용 push
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git
3. Build command: 비워둠
4. Build output directory: `/`
5. Deploy

## 구조
- `index.html` 메인
- `css/style.css` 스타일
- `js/app.js` 로직
- `data/units.json` 단원/문장/빈칸 데이터

## v7 변경점
- 블랙리스트 추가: 생활, 현상, 시설, 협력, 생산량, 하천, 종교, 곡물
- 용언 명사형(-음) 필터 강화: 많음/높음/있음 등 제외
- "등의", "등을" 같은 부산물 제거
- 파서: Unit 헤더 매칭 정확도 개선
