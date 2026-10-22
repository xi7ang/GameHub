#!/usr/bin/env node
/**
 * scripts/steam-match.mjs
 * 给还没有 steamAppID 的资源按标题去 Steam 商店搜索，保守地自动匹配 AppID。
 *
 *   node scripts/steam-match.mjs [--limit N] [--offset N] [--dry-run] [--delay 450]
 *                                [--report 路径.json]
 *
 * 匹配原则（宁可漏，不可错）：
 *   - 只写回高置信匹配：归一化后与商店名完全相等，或相似度 ≥0.9 且明显胜出；
 *   - 分数不够、赢得不明显、标题像合集/系列的，一律只进报告的待确认区，不写回；
 *   - 本脚本只写 steamAppID；资料补齐继续用 steam-import.mjs --batch。
 * 报告同时生成 .json 与 .md，含每条的 Steam 商店名，方便人工抽查。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_FILE = path.join(ROOT, 'public/data/resources.json')
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const args = process.argv.slice(2)
const opt = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : null
}
const limit = Number(opt('--limit')) || Infinity
const offset = Number(opt('--offset')) || 0
const delay = Number(opt('--delay')) || 450
const dryRun = args.includes('--dry-run')
const reportPath = opt('--report') || path.join(ROOT, 'steam-match-report.json')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ---------- 标题清洗与名字变体 ----------
const SUFFIX_WORDS = [
  '支持网络联机', '内置修改器', '内置菜单', '修改器', '金手指', '中文版', '汉化版',
  '手机版', '安卓版', '移植版', '修复版', '精简版', '硬盘版', '免安装版', '电脑版',
  '单机+联机', '网络联机', '支持联机', '单机', '联机', '中文', '电脑',
]
function cleanSegment(s) {
  let t = String(s || '')
  t = t.replace(/[_-]?(ver\.?|v|build\.?)\s*[\d][\w.]*/gi, ' ')      // 版本号
  t = t.replace(/(附|赠|打包|单独|内含|包含).*$/, ' ')               // 附赠说明
  t = t.replace(/\s+/g, ' ').trim()
  let changed = true
  while (changed) {
    changed = false
    for (const w of SUFFIX_WORDS) {
      if (t.endsWith(w) && t.length - w.length >= 2) { t = t.slice(0, -w.length).trim(); changed = true }
    }
  }
  return t
}
function nameVariants(r) {
  const raw = new Set()
  const add = (s) => { const v = cleanSegment(s); if (v && v.length >= 2) raw.add(v) }
  if (r.enTitle) add(r.enTitle)
  const title = String(r.title || '')
  // 括号里的内容单独成段（常是英文名或合集说明）
  for (const m of title.matchAll(/[（(]([^（）()]*)[）)]/g)) add(m[1])
  const noParen = title.replace(/[（(][^（）()]*[）)]/g, ' ')
  for (const part of noParen.split(/[/／|｜]/)) {
    add(part)
    // 中英混排时再按语种边界拆开：「科罗蒙Coromon」「当幽灵来敲门Knock-Knock」
    const segs = part.match(/[一-鿿]+(?:\s*[·：:]\s*[一-鿿]+)*|[A-Za-z0-9][A-Za-z0-9\s:'\-&.]+/g) || []
    for (const seg of segs) add(seg)
  }
  add(title)
  return [...raw]
}

// ---------- 归一化与相似度 ----------
const EDITION_SUFFIX = [
  'gameoftheyearedition', 'definitiveedition', 'completeedition', 'specialedition',
  'enhancededition', 'legendaryedition', 'ultimateedition', 'deluxeedition',
  'directorscut', 'remastered', 'remake', 'edition', 'goty', 'deluxe', 'ultimate',
  '年度版', '决定版', '终极版', '豪华版', '完整版', '完全版', '特别版', '增强版',
  '重制版', '重置版', '传奇版', '导演剪辑版', '中文版',
]
function norm(s) {
  let t = String(s || '').toLowerCase().replace(/[™®©]/g, '')
  t = t.replace(/ⅰ/g, 'i').replace(/ⅱ/g, 'ii').replace(/ⅲ/g, 'iii').replace(/ⅳ/g, 'iv')
    .replace(/ⅴ/g, 'v').replace(/ⅵ/g, 'vi').replace(/ⅶ/g, 'vii').replace(/ⅷ/g, 'viii')
    .replace(/ⅸ/g, 'ix').replace(/ⅹ/g, 'x')
  t = t.replace(/[^a-z0-9一-鿿]/g, '')
  if (t.startsWith('the')) t = t.slice(3)
  let changed = true
  while (changed) {
    changed = false
    for (const suf of EDITION_SUFFIX) {
      if (t.endsWith(suf) && t.length - suf.length >= 3) { t = t.slice(0, -suf.length); changed = true }
    }
  }
  return t
}
function dice(a, b) {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0
  const grams = (s) => {
    const m = new Map()
    for (let i = 0; i < s.length - 1; i++) m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) || 0) + 1)
    return m
  }
  const ga = grams(a); const gb = grams(b)
  let hit = 0
  for (const [g, n] of ga) hit += Math.min(n, gb.get(g) || 0)
  return (2 * hit) / (a.length - 1 + (b.length - 1))
}
function scorePair(variant, candName) {
  const a = norm(variant); const b = norm(candName)
  if (!a || !b) return 0
  if (a === b) return 100
  // 包含关系：一方是另一方的前缀/子串，且短的那个不太短
  if ((a.includes(b) || b.includes(a)) && Math.min(a.length, b.length) >= 4) {
    const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length)
    if (ratio >= 0.55) return 88
  }
  return Math.round(dice(a, b) * 100)
}

// ---------- 防错配护栏 ----------
// 标题里的续作数字（如「生化危机3」）必须在候选名里出现，否则压到待确认区：
// 用户数据里的 enTitle 偶尔只写系列名（RE3 只写 Resident Evil），不能直接信。
// 只认阿拉伯数字：中文数字太容易误伤（「在一起」的一、「三国志」的三都不是续作编号）
function numbersOf(s) {
  return new Set((String(s || '').match(/\d+/g) || []).map((n) => String(parseInt(n, 10))))
}
function cjkChars(s) {
  return new Set((String(s || '').match(/[一-鿿]/g) || []))
}
function applyGuards(score, r, candName) {
  let s = score
  const noParenTitle = cleanSegment(String(r.title || '').replace(/[（(][^（）()]*[）)]/g, ' '))
  const titleNums = numbersOf(noParenTitle)
  if (titleNums.size) {
    const candNums = numbersOf(candName)
    if (![...titleNums].every((n) => candNums.has(n))) s = Math.min(s, 84)
  }
  const tCjk = cjkChars(noParenTitle); const cCjk = cjkChars(candName)
  if (tCjk.size && cCjk.size && ![...tCjk].some((c) => cCjk.has(c))) s = Math.min(s, 84)
  return s
}

// ---------- Steam 搜索（带缓存与限速） ----------
const searchCache = new Map()
async function storeSearch(term) {
  if (searchCache.has(term)) return searchCache.get(term)
  const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=schinese&cc=CN`
  let items = []
  try {
    const j = await fetchJSON(url)
    items = (j.items || []).filter((it) => !it.type || it.type === 'app')
  } catch { items = [] }
  searchCache.set(term, items)
  await sleep(delay)
  return items
}
async function findCandidates(r, variants) {
  const seen = new Map()
  const queries = [...variants]
  // 中文长名搜不到时逐步缩短前缀（Steam 对中文名的前缀匹配更友好）
  const zh = variants.filter((v) => /[一-鿿]/.test(v)).sort((a, b) => b.length - a.length)[0]
  for (const q of queries) {
    const items = await storeSearch(q)
    for (const it of items) if (!seen.has(it.id)) seen.set(it.id, it)
    if (seen.size) return [...seen.values()]
  }
  if (zh && zh.length > 4) {
    for (let len = zh.length - 1; len >= 4; len--) {
      const items = await storeSearch(zh.slice(0, len))
      for (const it of items) if (!seen.has(it.id)) seen.set(it.id, it)
      if (seen.size) return [...seen.values()]
    }
  }
  return []
}

// ---------- 主流程 ----------
const BUNDLE_RE = /系列|合集|整合包|全集|三部曲|双作|大合集|合辑/
async function main() {
  const resources = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  const targets = resources.filter((r) => !r.steamAppID).slice(offset, offset + limit)
  console.log(`待匹配 ${targets.length} 条（dryRun=${dryRun}，间隔 ${delay}ms）`)
  const report = { accepted: [], review: [], unmatched: [] }
  let done = 0
  for (const r of targets) {
    done++
    const variants = nameVariants(r)
    let entry = { id: r.id, title: r.title, category: r.category }
    try {
      const cands = await findCandidates(r, variants)
      const scored = cands.map((c) => {
        let best = 0; let via = ''
        for (const v of variants) { const s = scorePair(v, c.name); if (s > best) { best = s; via = v } }
        return { appid: c.id, name: c.name, score: applyGuards(best, r, c.name), via }
      }).sort((a, b) => b.score - a.score)
      const top = scored[0]
      const second = scored[1]
      const bundleLike = BUNDLE_RE.test(r.title) && !(r.enTitle && top && scorePair(r.enTitle, top.name) === 100)
      if (top && top.score >= 90 && (!second || top.score - second.score >= 4) && !bundleLike) {
        entry = { ...entry, appid: top.appid, steamName: top.name, score: top.score, via: top.via }
        report.accepted.push(entry)
        if (!dryRun) r.steamAppID = top.appid
        console.log(`✓ ${r.id} 《${r.title}》 → ${top.appid} 《${top.name}》 (${top.score})`)
      } else if (top && top.score >= 70) {
        entry = { ...entry, candidates: scored.slice(0, 3), reason: bundleLike ? '标题像合集/系列' : top.score < 90 ? '分数不足' : '与第二名太接近' }
        report.review.push(entry)
        console.log(`? ${r.id} 《${r.title}》 待确认: ${scored.slice(0, 2).map((c) => `${c.name}(${c.score})`).join(' / ')}`)
      } else {
        report.unmatched.push(entry)
      }
    } catch (e) {
      entry = { ...entry, candidates: [], reason: `搜索出错: ${e?.message || e}` }
      report.review.push(entry)
    }
    if (done % 25 === 0 || done === targets.length) {
      if (!dryRun) fs.writeFileSync(DATA_FILE, JSON.stringify(resources, null, 2) + '\n', 'utf8')
      console.log(`进度 ${done}/${targets.length}：已匹配 ${report.accepted.length}，待确认 ${report.review.length}，未找到 ${report.unmatched.length}`)
    }
  }
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')
  const md = [
    `# Steam 匹配报告`,
    ``,
    `自动匹配 ${report.accepted.length} 条，待确认 ${report.review.length} 条，未找到 ${report.unmatched.length} 条。`,
    ``,
    `## 已自动匹配（资源标题 → Steam 商店名）`,
    ...report.accepted.map((x) => `- ${x.id} 《${x.title}》 → ${x.appid} 《${x.steamName}》（${x.score} 分）`),
    ``,
    `## 待人工确认`,
    ...report.review.map((x) => `- ${x.id} 《${x.title}》：${(x.candidates || []).map((c) => `${c.appid} 《${c.name}》 ${c.score}分`).join('；') || '无候选'}（${x.reason || ''}）`),
    ``,
    `## 未找到`,
    ...report.unmatched.map((x) => `- ${x.id} 《${x.title}》`),
  ].join('\n')
  fs.writeFileSync(reportPath.replace(/\.json$/, '.md'), md, 'utf8')
  console.log(`\n完成：匹配 ${report.accepted.length}，待确认 ${report.review.length}，未找到 ${report.unmatched.length}`)
  console.log(`报告：${reportPath}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
