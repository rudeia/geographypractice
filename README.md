# 세계시민과 지리 · 빈칸 학습지

안좌고등학교 사회과 · 세계시민과 지리 빈칸 학습 웹사이트

## 구조
- `index.html` — 메인 페이지
- `css/style.css` — 칠판 테마 스타일
- `js/app.js` — 학습/타임어택 로직
- `data/units.json` — 단원별 학습 데이터 (13개 대단원)

## 주요 기능
- **학습 모드**: 대단원 → 중단원 → 소단원 선택, 소단원 단위로 전체 표시 (중간에 잘림 없음)
- **타임어택**: 시간/대단원 선택, 정답 +10 / 오답 −5 / 최소 0점, 종료 후 풀이 기록 표시
- 합성 개념어 통째 빈칸 (세계시민, 초국적 기업, 문화 다양성 등)
- 정답 입력 시 즉시 '정답!' 토스트, 초록 분필색 표시
- 오답은 빨간 분필색 + 흔들림 애니메이션

## 로컬 테스트
```bash
python -m http.server 8080
# http://localhost:8080
```

## Cloudflare Pages 배포
1. GitHub 저장소 생성 후 이 폴더 전체 push
2. Cloudflare → Workers & Pages → Create → Pages → Connect to Git
3. Build command 비움 / Output directory: `/`
4. Deploy

## 데이터 갱신
`data/units.json`만 교체하면 됩니다. 포맷은 현재 파일 참고.
