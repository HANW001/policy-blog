#!/usr/bin/env python3
"""
정책정보 블로그 AI 초안 생성 스크립트

사용법:
  # 단일 파일 생성
  python generate_draft.py --config configs/근로장려금-신청-자격.yaml

  # 전체 configs/ 폴더 일괄 생성
  python generate_draft.py --all

  # dry-run (MongoDB 저장 없이 터미널 출력만)
  python generate_draft.py --config configs/근로장려금-신청-자격.yaml --dry-run
"""

import anthropic
import pymongo
import yaml
import os
import json
import argparse
import random
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env.local")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MONGODB_URI = os.getenv("MONGODB_URI")
MODEL = "claude-sonnet-4-6"

# 문체 변주: 서두 패턴 4종 로테이션 (양산 신호 차단)
INTRO_STYLES = [
    "결론부터: {핵심_한줄}",
    "{제도명}을 신청하려는데 내가 해당되는지 모르겠다면, 이 글이 답이다.",
    "매년 수십만 명이 {제도명}을 놓친다. 이유는 단 하나 — 조건을 몰라서다.",
    "{제도명}, 신청 가능 여부를 30초 안에 확인하자.",
]

PASS1_SYSTEM = """당신은 정부 제도·지원금 정보 블로그의 전문 작성자다.
반드시 지켜야 할 규칙:
1. 아래 JSON에 명시된 수치·조건·날짜만 사용한다. JSON에 없는 내용은 절대 쓰지 않는다.
2. 불확실하거나 JSON에 없는 정보는 반드시 '(공식 출처 확인 필요)'로 표기한다.
3. 독자는 '{title}'을 검색한 사람이다. 첫 문단에서 본인 해당 여부를 즉시 판단하게 한다.
4. 마크다운 형식으로 작성한다. 총 1,500자 이상.
5. 구조: 요약(신청 가능 여부 즉시 판단) → 비교표 1개 → 신청 방법 단계별 → 제외대상 섹션 → FAQ 3개 → 공식 출처 링크
"""

PASS1_USER = """다음 JSON 데이터만을 사용하여 블로그 글을 작성해라.

제목: {title}
서두 스타일: {intro_style}

[입력 데이터]
{data_json}

출력 형식 (JSON):
{{
  "content": "마크다운 본문 (1500자 이상)",
  "summary": "200자 이내 요약 (meta description용)",
  "faq_items": [
    {{"question": "...", "answer": "..."}},
    {{"question": "...", "answer": "..."}},
    {{"question": "...", "answer": "..."}}
  ]
}}
"""

PASS2_SYSTEM = """당신은 팩트체커다. 아래 원본 데이터와 작성된 글을 비교하여 불일치를 찾아라."""

PASS2_USER = """[원본 데이터]
{data_json}

[작성된 글]
{content}

다음 형식으로 검토 결과를 반환해라:
{{
  "issues": ["불일치 항목1", "불일치 항목2"],
  "approved": true
}}

규칙:
- issues는 원본 데이터와 실제로 다른 수치·조건·날짜가 있을 때만 기재한다.
- 원본 데이터에 없는 내용이 글에 추가된 경우도 불일치로 기재한다.
- 이슈가 0개이면 approved는 true, 1개 이상이면 false로 설정한다.
"""


def parse_json_response(raw: str) -> dict:
    """마크다운 코드블록 제거 후 JSON 파싱"""
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # 첫 줄(```json 또는 ```) 및 마지막 줄(```) 제거
        text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
    return json.loads(text)


def generate_draft(config_path: str, dry_run: bool = False) -> None:
    with open(config_path, encoding="utf-8") as f:
        config = yaml.safe_load(f)

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    data_json = json.dumps(
        {
            "key_facts": config.get("key_facts", {}),
            "context": config.get("context", {}),
            "source_url": config.get("source_url", ""),
        },
        ensure_ascii=False,
        indent=2,
    )

    intro_style = random.choice(INTRO_STYLES).format(
        제도명=config["title"].split(" ")[0],
        핵심_한줄=config.get("key_facts", {}).get("지원금액", "정보 확인 필요"),
    )

    # Pass 1: 초안 생성
    print(f"[Pass 1] {config['slug']} 초안 생성 중...")
    resp1 = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=PASS1_SYSTEM.format(title=config["title"]),
        messages=[
            {
                "role": "user",
                "content": PASS1_USER.format(
                    title=config["title"],
                    intro_style=intro_style,
                    data_json=data_json,
                ),
            }
        ],
    )

    draft = parse_json_response(resp1.content[0].text)

    # Pass 2: 팩트체크
    print(f"[Pass 2] {config['slug']} 팩트체크 중...")
    resp2 = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=PASS2_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": PASS2_USER.format(
                    data_json=data_json,
                    content=draft["content"],
                ),
            }
        ],
    )

    check = parse_json_response(resp2.content[0].text)

    if check.get("issues"):
        print(f"  경고 불일치 발견: {check['issues']}")
    else:
        print(f"  완료 팩트체크 통과")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "slug": config["slug"],
        "title": config["title"],
        "category": config["category"],
        "cluster": config.get("cluster", ""),
        "content": draft["content"],
        "summary": draft["summary"],
        "faq_items": draft["faq_items"],
        "key_facts": config.get("key_facts", {}),
        "source_url": config.get("source_url", ""),
        "published_at": now,
        "updated_at": now,
        "status": "draft",
        "view_count": 0,
        "_generation_meta": {
            "model": MODEL,
            "pass2_issues": check.get("issues", []),
            "pass2_approved": check.get("approved", False),
        },
    }

    if dry_run:
        print(json.dumps(doc, ensure_ascii=False, indent=2))
        return

    mongo = pymongo.MongoClient(MONGODB_URI)
    db = mongo["policy_db"]
    db["policy_articles"].update_one(
        {"slug": doc["slug"]},
        {"$set": doc},
        upsert=True,
    )
    mongo.close()
    print(f"  완료 MongoDB 저장 완료: {doc['slug']} (status=draft)")


def main() -> None:
    parser = argparse.ArgumentParser(description="정책정보 블로그 AI 초안 생성 스크립트")
    parser.add_argument("--config", help="단일 YAML 파일 경로")
    parser.add_argument("--all", action="store_true", help="configs/ 전체 처리")
    parser.add_argument("--dry-run", action="store_true", help="MongoDB 저장 없이 출력만")
    args = parser.parse_args()

    configs_dir = Path(__file__).parent / "configs"

    if args.all:
        yaml_files = sorted(configs_dir.glob("*.yaml"))
        if not yaml_files:
            print("configs/ 폴더에 YAML 파일이 없습니다.")
            return
        for yml in yaml_files:
            generate_draft(str(yml), dry_run=args.dry_run)
    elif args.config:
        generate_draft(args.config, dry_run=args.dry_run)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
