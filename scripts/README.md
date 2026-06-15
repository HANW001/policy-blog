# AI 초안 생성 스크립트

## 설치

```bash
cd scripts
pip install -r requirements.txt
```

## 환경변수 (.env.local 에 추가)

`ANTHROPIC_API_KEY`, `MONGODB_URI` 필요.

## 사용법

```bash
# 단일 글 생성 (테스트)
python generate_draft.py --config configs/근로장려금-신청-자격.yaml --dry-run

# 단일 글 MongoDB 저장
python generate_draft.py --config configs/근로장려금-신청-자격.yaml

# 15편 전체 일괄 생성
python generate_draft.py --all
```

## 검수 워크플로우

1. `python generate_draft.py --all` → MongoDB에 15편 status=draft 저장
2. `/admin` 페이지 접속 → ADMIN_SECRET 입력
3. 각 글 "미리보기" 클릭 → 공식 출처 대조 팩트체크 (15~20분/편)
4. 이상 없으면 "검수 시작" → "발행" 클릭
5. status=published 글만 사이트에 노출됨

## 팁

- Pass 2 팩트체크 이슈가 있는 글은 Admin에서 빨간 뱃지로 표시됨
- configs/*.yaml 에서 key_facts, context 내용을 공식 출처 확인 후 업데이트하면 품질 향상
