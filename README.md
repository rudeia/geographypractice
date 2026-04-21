# 세계시민과 지리 · 빈칸 학습지 (MVP)

정적 사이트입니다. 서버가 필요 없으며, GitHub Pages 또는 Cloudflare Pages로 바로 배포할 수 있습니다.

## 폴더 구조
```
/
├── index.html
├── css/style.css
├── js/app.js
└── data/units.json   # 단원별 학습 데이터
```

## 로컬에서 확인
프로젝트 루트에서 간단히 웹서버를 띄우세요. (예: Python)
```bash
python -m http.server 8080
# 브라우저에서 http://localhost:8080
```
> `fetch('data/units.json')` 때문에 파일을 바로 여는 것(`file://`)은 동작하지 않습니다. 꼭 로컬 서버로 열어주세요.

## Cloudflare Pages 배포
1. 이 폴더를 GitHub 레포지토리에 업로드 (push)
2. Cloudflare 대시보드 → **Workers & Pages → Create → Pages → Connect to Git**
3. 레포 선택 → Framework preset: **None** → Build command 비움 → Build output directory: `/`(루트)
4. Deploy

## 사용법
- 상단에서 **단원**을 선택하고 **시작** 버튼을 누르면 빈칸 학습지가 생성됩니다.
- **빈칸 수**는 기본 10개, 1~50 조절 가능.
- 입력하는 즉시 정답이면 초록색으로 고정됩니다.
- **타임어택** 탭에서는 제한 시간 동안 풀며, 엔터로 제출하면 오답 시 5점 감점(최소 0점), 정답 시 10점 상승합니다.

## 데이터 추가
`data/units.json`에 아래 형식으로 단원을 추가하세요.
```json
{
  "id": "ch5_①",
  "chapter": "5",
  "title": "5. 단원 제목 - ①",
  "sentences": [
    "문장1...",
    "문장2..."
  ]
}
```
빈칸은 JS가 자동으로 조사를 제외한 한글 단어 중에서 무작위로 선택합니다.
