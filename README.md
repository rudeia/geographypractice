# 세계시민과 지리 · 빈칸 학습지 (v8)

## 변경 요약 (v8)
- **계층 구조 복원**: `1. → ⑴ → ① → -` 원본 학습지 구조를 그대로 유지합니다.
- **블록 단위 표시**: 항목 하나를 통째로 보여주므로 문맥이 유지됩니다.
- **빈칸 밀도 제한**: 한 항목(블록)당 빈칸 최대 2~3개.
- **페이지 분할 규칙**: 블록을 누적하다가 빈칸이 설정값(기본 10)에 도달하면 페이지 분할.
  단, 학습지 원본의 ①/②/③ (sub) 경계가 바뀔 때 강제 개행.
- 필터 (블랙리스트, 용언 필터, 합성어 통째 처리)는 v7 기준 유지.

## 로컬 실행
```bash
cd site
python -m http.server 8080
# → http://localhost:8080
```

## 배포 (Cloudflare Pages)
1. 이 폴더 전체를 GitHub 저장소에 push
2. Cloudflare Pages → Create → Connect to Git
3. Build command: (비움) / Output directory: `/`
4. Deploy
