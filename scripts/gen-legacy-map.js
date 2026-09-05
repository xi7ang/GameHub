#!/usr/bin/env node
/**
 * 生成旧站(xi7ang.github.io) -> GameHub 的资源映射表 legacy-map.json
 * 关联键：夸克分享码（pan.quark.cn/s/CODE）
 * 输出：public/data/legacy-map.json  { "games:1329": "mobile-202608-0016", ... }
 * 用法：node scripts/gen-legacy-map.js <旧站resources.json路径>
 */
import fs from 'node:fs'
import path from 'node:path'

const OLD_JSON = process.argv[2]
if (!OLD_JSON) {
  console.error('用法: node scripts/gen-legacy-map.js <旧站resources.json>')
  process.exit(1)
}

function load(p) {
  const d = JSON.parse(fs.readFileSync(p, 'utf8'))
  return Array.isArray(d) ? d : d.resources || d.items || []
}

function shareCode(url) {
  if (!url) return null
  const m = String(url).match(/pan\.quark\.cn\/s\/([A-Za-z0-9]+)/)
  return m ? m[1] : null
}

const oldRes = load(OLD_JSON)
const newRes = load(path.join(process.cwd(), 'public/data/resources.json'))

// GameHub 侧：分享码 -> [ids]
const newByCode = new Map()
for (const r of newRes) {
  const c = shareCode(r.url)
  if (!c) continue
  if (!newByCode.has(c)) newByCode.set(c, [])
  newByCode.get(c).push(r.id)
}

const map = {}
const unmatched = []
let matched = 0
for (const r of oldRes) {
  const c = shareCode(r.url)
  const key = `${r.category}:${r.id}`
  if (c && newByCode.has(c)) {
    const ids = newByCode.get(c)
    if (ids.length === 1) {
      map[key] = ids[0]
      matched++
      continue
    }
    // 分享码撞车（同一链接多资源）：优先同标题/含标题
    const hit = ids.find((id) => {
      const n = newRes.find((x) => x.id === id)
      return n && (n.title || '').includes((r.title || '').slice(0, 8))
    })
    if (hit) { map[key] = hit; matched++; continue }
    map[key] = ids[0]
    matched++
    continue
  }
  unmatched.push({ cat: r.category, id: r.id, title: r.title, url: r.url })
}

const outPath = path.join(process.cwd(), 'public/data/legacy-map.json')
fs.writeFileSync(outPath, JSON.stringify(map, null, 0) + '\n')
console.log(`✅ legacy-map.json: ${Object.keys(map).length} 条映射 (旧站 ${oldRes.length} 条, 匹配 ${matched}, 未匹配 ${unmatched.length})`)
if (unmatched.length) {
  console.log('未匹配样例:', unmatched.slice(0, 5).map((u) => `${u.cat}:${u.id} ${u.title}`).join(' | '))
}
