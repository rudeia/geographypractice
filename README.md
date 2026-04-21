# 세계시민과 지리 빈칸 학습 사이트 (v11)

## 개선점
- 학습지 누락 없이 모든 내용 재파싱 (13개 대단원, 430페이지, 1,254 빈칸)
- 특수문자(·, / 등)로 구분된 어휘는 각 부분만 빈칸 처리 (예: 사람·물자·정보 → 셋 중 하나만)
- 정답 공백 유무 모두 인정 (국제 연합 = 국제연합)
- 원본 계층 구조 `1. → ⑴ → ① → -` 완전 보존

## 로컬 테스트
```
python -m http.server 8080
# → http://localhost:8080
```

## 배포 (Cloudflare Pages)
1. GitHub에 파일 업로드
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git
3. Build command: (비움) / Output directory: /
4. Deploy
