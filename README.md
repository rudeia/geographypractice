# 세계시민과 지리 · 빈칸 학습 사이트 v3

## 포함 단원 (총 13개)
- Ⅰ. 세계화와 지역 이해 (3단원)
- Ⅱ. 세계의 자연환경과 인간 생활 (4단원)
- Ⅲ. 세계의 인구·식량·경제 (3단원)
- Ⅳ. 에너지·환경·평화 (3단원)

## 로컬 실행
```
python -m http.server 8080
# 브라우저: http://localhost:8080
```
> ⚠️ file:// 로 직접 열면 JSON을 불러오지 못합니다. 반드시 로컬 서버로 띄워주세요.

## 배포 (GitHub + Cloudflare Pages)
1. 이 폴더를 그대로 GitHub 레포에 push
2. Cloudflare → Workers & Pages → Create → Pages → Connect to Git
3. Build command: (비움) / Build output directory: `/`
4. Deploy

## 기능
- 학습 모드: 단원 선택 + 빈칸 개수 조절(1~50) + 실시간 채점
- 타임어택: 시간 조절(10~600초), 정답 +10 / 오답 -5 / 최소 0점
- 섹션 구분선: 다른 소단원 문장 사이에 `· · ·` 표시
- 반응형: 모바일/태블릿/데스크톱 자동 대응

## 데이터 수정
`data/units.json` 을 직접 편집하거나, 새 PDF 텍스트를 주시면 다시 파싱하여 업데이트합니다.
