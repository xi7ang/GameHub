#!/usr/bin/env node
/**
 * scripts/fetch-covers.js — 从 Steam 公开 API 获取游戏封面，转 webp 本地化
 *
 * 流程：
 *   1. 遍历 resources.json 中 cover 为空的资源
 *   2. 优先用 enTitle（英文名最准），无则用 title 调 Steam storesearch API
 *   3. 匹配校验：返回结果 name 与查询词归一化后包含/相等，防错误匹配
 *   4. 下载 header.jpg → cwebp 转 webp → public/covers/{appid}.webp
 *   5. 更新 cover 字段为 /covers/{appid}.webp
 *
 * 用法：node scripts/fetch-covers.js [--limit N] [--dry-run]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, '../public/data/resources.json')
const COVERS_DIR = path.join(__dirname, '../public/covers')
const COVER_BASE = '/covers/'

const args = process.argv.slice(2)
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : null
const DRY_RUN = args.includes('--dry-run')

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
fs.mkdirSync(COVERS_DIR, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 归一化：去空格/标点/大小写/版本号，便于比较
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    .replace(/v?\d+(\.\d+)+/g, '')
    .replace(/build\d*/g, '')
    .trim()
}

async function searchSteam(query) {
  const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&cc=cn&l=schinese`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) return []
  const json = await res.json()
  return json.items || []
}

function pickMatch(items, query) {
  const q = norm(query)
  if (!q) return null
  // 1. 精确相等
  const exact = items.find((it) => norm(it.name) === q)
  if (exact) return exact
  // 2. 查询词包含于结果名（防"Palworld"匹配到"Palworld Soundtrack"）
  const contains = items.find((it) => norm(it.name).includes(q) && norm(it.name).length - q.length <= 8)
  if (contains) return contains
  // 3. 结果名包含查询词
  const inName = items.find((it) => q.includes(norm(it.name)) && q.length - norm(it.name).length <= 8)
  if (inName) return inName
  return null
}

async function downloadWebp(appid) {
  const outFile = path.join(COVERS_DIR, `${appid}.webp`)
  if (fs.existsSync(outFile)) return outFile
  const jpgUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`
  const tmpJpg = outFile + '.tmp.jpg'
  const res = await fetch(jpgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) return null
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(tmpJpg, buf)
  try {
    execSync(`cwebp -quiet -q 78 "${tmpJpg}" -o "${outFile}"`, { stdio: 'pipe' })
  } catch {
    fs.rmSync(tmpJpg, { force: true })
    return null
  }
  fs.rmSync(tmpJpg, { force: true })
  return outFile
}

// ── 主流程 ──
let matched = 0
let skipped = 0
let failed = 0
const pending = data.filter((r) => !r.cover)
const targets = LIMIT ? pending.slice(0, LIMIT) : pending

console.log(`待处理: ${pending.length} 条（本次执行 ${targets.length} 条）`)

for (const r of targets) {
  const query = (r.enTitle || '').trim() || r.title.trim()
  try {
    const items = await searchSteam(query)
    const hit = pickMatch(items, query)
    if (hit) {
      const outFile = await downloadWebp(hit.id)
      if (outFile) {
        const kb = Math.round(fs.statSync(outFile).size / 1024)
        r.cover = `${COVER_BASE}${hit.id}.webp`
        console.log(`✅ [${r.id}] ${r.title} → ${hit.name} (${hit.id}) ${kb}KB`)
        matched++
      } else {
        console.log(`⚠️ [${r.id}] ${r.title} → 下载失败 (${hit.id})`)
        failed++
      }
    } else {
      skipped++
      if (targets.length <= 30) console.log(`⏭️  [${r.id}] ${r.title} → 未匹配「${query}」`)
    }
  } catch (e) {
    failed++
    if (targets.length <= 30) console.log(`❌ [${r.id}] ${r.title} → ${e.message}`)
  }
  await sleep(250) // 限速，避免 429
}

console.log(`\n完成: 匹配 ${matched} | 跳过 ${skipped} | 失败 ${failed}`)

if (!DRY_RUN && matched > 0) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
  console.log('✅ resources.json 已更新 cover 字段')
} else {
  console.log('⚠️ 未写回（dry-run 或无匹配）')
}
