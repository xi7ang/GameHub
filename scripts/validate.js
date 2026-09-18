#!/usr/bin/env node
/**
 * scripts/validate.js
 * 数据完整性校验：CI 和后台提交前都跑，坏数据进不了仓库。
 * 校验 resources.json / categories.json / site.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareRecords, searchIndex } from '../src/lib/search-core.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../public/data')
const STATUSES = ['active', 'inactive']
const TAG_MAX = 8
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)$/

const errors = []
const warn = []

function read(name) {
  const p = path.join(DATA_DIR, name)
  if (!fs.existsSync(p)) errors.push(`缺失数据文件: ${name}`)
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function check(cond, msg) {
  if (!cond) errors.push(msg)
}

// ── categories.json ──
const cats = read('categories.json')
const catKeys = new Set()
check(Array.isArray(cats) && cats.length > 0, 'categories.json 必须是非空数组')
cats.forEach((c, i) => {
  check(c.key && /^[a-z0-9-]+$/.test(c.key), `分类[${i}] key 非法: ${c.key}`)
  check(!catKeys.has(c.key), `分类 key 重复: ${c.key}`)
  catKeys.add(c.key)
  check(typeof c.name === 'string' && c.name, `分类[${i}] 缺 name`)
  check(Array.isArray(c.gradient) && c.gradient.length === 2, `分类[${c.key}] gradient 必须是 2 色数组`)
  check(typeof c.order === 'number', `分类[${c.key}] order 必须是数字`)
})

// ── site.json ──
const site = read('site.json')
check(site.siteName, 'site.json 缺 siteName')
check(typeof site.platforms === 'object' && Object.keys(site.platforms).length > 0, 'site.json 缺 platforms')
// 平台列表以 site.json 为准（后台可编辑），资源校验与之一致
const PLATFORMS = Object.keys(site.platforms || {})

// ── resources.json ──
const res = read('resources.json')
check(Array.isArray(res), 'resources.json 必须是数组')
const ids = new Set()
const urls = new Set()
// 封面路径必须指向 public/covers 下的本地文件（部署于域名根路径，不再允许 /GameHub 之类子路径前缀）
const COVERS_DIR = path.join(__dirname, '../public/covers')
const COVER_RE = /^\/covers\/[A-Za-z0-9._-]+\.(webp|jpg|jpeg|png)$/i
res.forEach((r, i) => {
  const loc = `资源[${i}](${r.title || r.id || '?'})`
  check(r.id && typeof r.id === 'string', `${loc} 缺 id`)
  check(r.id && !ids.has(r.id), `${loc} id 重复: ${r.id}`)
  if (r.id) ids.add(r.id)
  check(r.title && typeof r.title === 'string', `${loc} 缺 title`)
  check(catKeys.has(r.category), `${loc} category 不存在: ${r.category}`)
  check(PLATFORMS.includes(r.platform), `${loc} platform 非法: ${r.platform}`)
  check(r.url && /^https?:\/\//.test(r.url), `${loc} url 非法`)
  if (r.url) {
    const u = r.url.replace(/[?&]pwd=[^&\s]+/, '').replace(/#.*$/, '')
    check(!urls.has(u), `${loc} url 重复: ${r.url}`)
    urls.add(u)
  }
  if (r.pwd != null) check(typeof r.pwd === 'string', `${loc} pwd 必须是字符串`)
  check(STATUSES.includes(r.status), `${loc} status 非法: ${r.status}`)
  check(typeof r.featured === 'boolean', `${loc} featured 必须是布尔`)
  check(Array.isArray(r.tags), `${loc} tags 必须是数组`)
  check(!r.tags || r.tags.length <= TAG_MAX, `${loc} tags 超过 ${TAG_MAX} 个`)
  // 封面路径校验：空串合法（无封面）；非空必须为 /covers/xxx 且文件真实存在于仓库
  if (r.cover) {
    check(COVER_RE.test(r.cover), `${loc} cover 路径非法(必须形如 /covers/xxx.webp): ${r.cover}`)
    const cfile = path.join(COVERS_DIR, path.basename(r.cover))
    check(fs.existsSync(cfile), `${loc} cover 文件不存在于 public/covers: ${r.cover}`)
    check(!/gamehub/i.test(r.cover), `${loc} cover 不应包含 /GameHub 子路径前缀: ${r.cover}`)
  }
  // steamAppID：可选，存在时必须为正整数；且当 cover 形如 /covers/<数字>.webp 时必须一致
  if (r.steamAppID != null) {
    check(Number.isInteger(r.steamAppID) && r.steamAppID > 0, `${loc} steamAppID 必须是正整数: ${r.steamAppID}`)
    const m = /^\/covers\/(\d+)\.webp$/.exec(r.cover || '')
    if (m) check(Number(m[1]) === r.steamAppID, `${loc} steamAppID(${r.steamAppID}) 与 cover 文件名不一致`)
  }
  check(ISO_RE.test(r.addedAt), `${loc} addedAt 必须是 ISO8601 到秒: ${r.addedAt}`)
  check(ISO_RE.test(r.updatedAt), `${loc} updatedAt 必须是 ISO8601 到秒: ${r.updatedAt}`)
  if (r.addedAt) {
    const m = r.addedAt.slice(0, 7).replace('-', '')
    check(r.month === m, `${loc} month(${r.month}) 必须等于 addedAt 派生值(${m})`)
  }
  if (r.size && r.sizeBytes != null) {
    // 简单一致性：sizeBytes 与 size 不能明显矛盾（只提示）
    const parsed = parseSize(r.size)
    if (parsed && Math.abs(Math.log2(parsed / r.sizeBytes)) > 1) {
      warn.push(`${loc} size(${r.size}) 与 sizeBytes(${r.sizeBytes}) 不一致`)
    }
  }
})

function parseSize(s) {
  const m = String(s).match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i)
  if (!m) return null
  const units = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }
  return parseFloat(m[1]) * (units[(m[2] || 'B').toUpperCase()] || 1)
}

// ── search-index.json：构建期生成的搜索索引，必须与 resources.json 同步 ──
// 手工改资源却忘了重建索引 → 线上搜不到新资源，而且不会有任何报错。这里把它变成硬门禁。
const idxPath = path.join(DATA_DIR, 'search-index.json')
if (!fs.existsSync(idxPath)) {
  errors.push('缺失数据文件: search-index.json（运行 npm run build 生成）')
} else {
  const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'))
  const items = prepareRecords(idx.items)
  check(
    items.length === res.length,
    `search-index.json 已过期: ${items.length} 条 vs resources.json ${res.length} 条（重新运行 npm run build）`
  )
  const idxIds = new Set(items.map((it) => it[0]))
  const missing = res.filter((r) => r.id && !idxIds.has(r.id)).slice(0, 3).map((r) => r.id)
  check(!missing.length, `search-index.json 缺资源: ${missing.join(', ')}`)

  // 热门搜索词是手工维护、构建不重生成（2026-09 待办）：资源删改后热词可能静默搜不到。
  // 用与运行时同一套级联规则校验，热词必须至少命中 1 条。
  const hotPath = path.join(DATA_DIR, 'hotKeywords.json')
  if (fs.existsSync(hotPath)) {
    const hot = JSON.parse(fs.readFileSync(hotPath, 'utf8'))
    const kws = Array.isArray(hot.keywords) ? hot.keywords : []
    kws.forEach((kw) => {
      const r = searchIndex(items, kw)
      check(r.total > 0, `热门搜索词搜不到任何资源: 「${kw}」`)
      if (r.total > 0 && r.tier > 3) {
        warn.push(`热门搜索词「${kw}」只能命中第 ${r.tier + 1} 层（${r.name}），排序可能不理想`)
      }
    })
  }
}

// ── 输出 ──
if (warn.length) console.log('⚠️ 警告:\n  ' + warn.join('\n  '))
if (errors.length) {
  console.error(`❌ 校验失败 (${errors.length} 项):\n  ` + errors.join('\n  '))
  process.exit(1)
}
console.log(`✅ 数据校验通过: ${res.length} 条资源, ${cats.length} 个分类`)
