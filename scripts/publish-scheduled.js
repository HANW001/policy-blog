#!/usr/bin/env node
// Level 2 예약 발행(scheduled_publish_at) 시각이 지난 글을 자동으로 published로 전환한다.
// Admin에서 사람이 "48시간 후 예약 발행"으로 이미 등록해둔 글만 대상 —
// 검수/승인 자체는 여전히 사람이 Admin에서 직접 한다 (이 스크립트는 그 이후의
// "시간 되면 실제로 발행 상태로 바꾸는" 트리거 역할만 한다).
//
// 실행: node scripts/publish-scheduled.js [--dry-run]
// systemd 타이머(deploy/publish-scheduled.timer)로 주기 실행하는 걸 전제로 작성됨.

const fs = require("fs")
const path = require("path")
const { MongoClient } = require("mongodb")

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local")
  const content = fs.readFileSync(envPath, "utf-8")
  const env = {}
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx === -1) continue
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
  }
  return env
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  const env = loadEnvLocal()
  const uri = env.MONGODB_URI
  if (!uri) {
    console.error("MONGODB_URI를 .env.local에서 찾을 수 없습니다.")
    process.exit(1)
  }

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db("policy_db")
  const collection = db.collection("policy_articles")
  const now = new Date().toISOString()

  const query = { scheduled_publish_at: { $lte: now }, status: { $ne: "published" } }
  const due = await collection.find(query, { projection: { slug: 1, title: 1, scheduled_publish_at: 1 } }).toArray()

  if (due.length === 0) {
    console.log(`[${now}] 발행 예정 글 없음`)
    await client.close()
    return
  }

  if (dryRun) {
    console.log(`[${now}] --dry-run: ${due.length}건이 발행 대상입니다 (실제로 바꾸지 않음)`)
    due.forEach((d) => console.log(`  - ${d.slug} (예약: ${d.scheduled_publish_at})`))
    await client.close()
    return
  }

  const result = await collection.updateMany(query, {
    $set: { status: "published", updated_at: now },
    $unset: { scheduled_publish_at: "" },
  })

  console.log(`[${now}] 예약 발행 처리: ${result.modifiedCount}건`)
  due.forEach((d) => console.log(`  - ${d.slug}`))

  await client.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
