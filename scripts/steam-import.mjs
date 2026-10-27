#!/usr/bin/env node
/**
 * scripts/steam-import.mjs
 * 用 Steam 官方公开接口给一条已有资源补齐详情页资料，写入 resources.json 的 `steam` 字段。
 *
 * 为什么嵌套在 `steam` 字段里：
 *  - 现有字段（title / desc / cover / url …）是站内运营数据，不被商店数据覆盖；
 *  - validate.js 只校验已知字段，新增嵌套字段不影响现有 1000+ 条资源；
 *  - Resource.vue 里所有 Steam 区块都是 v-if="steam" 可选渲染，没数据的资源页面不变。
 *
 * 数据源（Steam 官方，无需 API Key）：
 *  - 商店详情 https://store.steampowered.com/api/appdetails
 *  - 评价汇总 https://store.steampowered.com/appreviews/<appid>?json=1
 *    （该接口从当前网络请求会被 Steam 302 到首页时，改从商店页
 *     https://store.steampowered.com/app/<appid>/ 的 All Reviews 行取
 *     等级 + 百分比 + 总评测数；商店页不给正负评拆分，备用口径的
 *     positive/negative 留空，不反推）
 *
 * 用法：
 *   node scripts/steam-import.mjs 814380
 *       按 steamAppID 找资源（必须恰好命中 1 条，多条/零条会报错并提示用 --id）
 *   node scripts/steam-import.mjs 814380 --id pc-202604-0031
 *       明确指定要补资料的资源 id
 *   加 --write 才真正写回 public/data/resources.json（默认只预览不落盘）
 *   node scripts/steam-import.mjs --batch
 *       批量给所有带 steamAppID 且没补过资料的资源补齐（去重请求、失败跳过、断点落盘）
 *   node scripts/steam-import.mjs --refill-rating
 *       只给已有 steam 资料但 rating 为空的资源补评价（不动其他字段，
 *       去重请求、失败跳过、断点落盘）
 *
 * 注意：description / summary 是 Steam 商店页的发行商文案，公开发布请遵守
 * Steam 使用条款或改写成自己的介绍；本脚本只负责搬运官方接口的公开数据。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, '../public/data/resources.json')

const args = process.argv.slice(2)
const appid = Number(args.find((a) => /^\d+$/.test(a)))
const opt = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : null
}
const targetId = opt('--id')
const lang = opt('--lang') || 'schinese'
const cc = opt('--cc') || 'CN'
const write = args.includes('--write')

const batch = args.includes('--batch')
const refillRating = args.includes('--refill-rating')
if (!appid && !batch && !refillRating) {
  console.error('用法: node scripts/steam-import.mjs <Steam AppID> [--id 资源id] [--write]')
  console.error('批量: node scripts/steam-import.mjs --batch [--delay 毫秒]')
  console.error('评价回填: node scripts/steam-import.mjs --refill-rating [--delay 毫秒]')
  process.exit(1)
}

function stripHtml(raw) {
  if (!raw) return ''
  const text = String(raw)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|h\d|ul)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
  return text
    .split('\n')
    .map((ln) => ln.trim())
    .filter(Boolean)
    .join('\n')
}

function parseRequirements(rawHtml) {
  if (!rawHtml) return []
  const items = [...String(rawHtml).matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => stripHtml(m[1]).replace(/\n/g, ' ').trim())
    .filter(Boolean)
  if (items.length) return items
  return stripHtml(rawHtml)
    .split('\n')
    .filter((ln) => !/^(最低配置|推荐配置|需要)/.test(ln))
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'GameHub-SteamImport/1.0' } })
  if (!res.ok) throw new Error(`请求失败 ${res.status}: ${url}`)
  return res.json()
}

async function fetchText(url, ageCookie = false) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml',
  }
  if (ageCookie) headers.Cookie = 'birthtime=631152000; lastagecheckage=1-January-1990'
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`请求失败 ${res.status}: ${url}`)
  return { text: await res.text(), url: res.url }
}

// 评价备用口径：直接取商店页，按行匹配 All Reviews（不是 Recent Reviews），
// 从该行的 tooltip 取百分比与总评测数，从等级 span 取等级文本。
// 商店页不给正负评拆分，因此 positive/negative 留空，绝不按百分比反推。
// 年龄验证：商店页跳到 agecheck 时，用成年年龄 cookie 再取一次（只跳确认页、
// 不要求登录的能拿到正文）；跳到登录页的（需登录验证）无法绕过，返回 null。
async function fetchRatingFromStorePage(appid) {
  const pageUrl = `https://store.steampowered.com/app/${appid}/`
  let { text: html, url } = await fetchText(pageUrl)
  if (url.includes('/login/')) return null
  if (url.includes('/agecheck/')) {
    const retry = await fetchText(pageUrl, true)
    if (retry.url.includes('/login/')) return null
    html = retry.text
  }
  const rows = [...html.matchAll(/<a class="user_reviews_summary_row"([^>]*)>([\s\S]*?)<\/a>/g)]
  for (const [, attrs, body] of rows) {
    if (!body.includes('subtitle column all')) continue
    const tip = attrs.match(/data-tooltip-html="([^"]+)"/)
    const desc = body.match(/<span class="game_review_summary[^"]*"[^>]*>([^<]+)<\/span>/)
    if (!tip || !desc) return null
    const m = tip[1].match(/(\d+)% of the ([\d,]+) user reviews/)
    if (!m) return null
    return {
      scoreDesc: desc[1].trim(),
      totalReviews: Number(m[2].replace(/,/g, '')),
      positive: null,
      negative: null,
      positiveRate: Number(m[1]),
    }
  }
  return null
}

// 评价：先走 appreviews（能给精确的正负评与 1 位小数好评率）；
// 不通或无数据时改从商店页取（等级 + 整数百分比 + 总评测数）；
// 两种口径都失败返回 null，调用方保持 rating 为空，不影响其他资料。
async function fetchRating(appid) {
  try {
    const rq = new URLSearchParams({ json: '1', language: 'all', purchase_type: 'all', num_per_page: '0' })
    const rev = await fetchJson(`https://store.steampowered.com/appreviews/${appid}?${rq}`)
    const s = rev.query_summary || {}
    if (s.total_reviews) {
      return {
        scoreDesc: s.review_score_desc || '',
        totalReviews: s.total_reviews,
        positive: s.total_positive,
        negative: s.total_negative,
        positiveRate: Math.round((s.total_positive * 1000) / s.total_reviews) / 10,
      }
    }
  } catch {
    /* appreviews 不通，走商店页备用口径 */
  }
  try {
    return await fetchRatingFromStorePage(appid)
  } catch {
    return null
  }
}

async function fetchSteam(appid) {
  const q = new URLSearchParams({ appids: String(appid), l: lang, cc })
  const payload = await fetchJson(`https://store.steampowered.com/api/appdetails?${q}`)
  const entry = payload[String(appid)]
  if (!entry?.success) throw new Error(`Steam 未返回 AppID ${appid} 的数据（可能下架或地区受限）`)
  const d = entry.data

  // 英文名：给 enTitle 为空的资源补上（另发一次 english 请求，只取 name）
  let enName = ''
  try {
    const qEn = new URLSearchParams({ appids: String(appid), l: 'english', cc })
    const pEn = await fetchJson(`https://store.steampowered.com/api/appdetails?${qEn}`)
    enName = pEn[String(appid)]?.data?.name || ''
  } catch {
    /* 英文名取不到不影响主流程 */
  }

  // 评价：先走 appreviews，不通时改从商店页 All Reviews 行取（见 fetchRating）。
  // 两种口径都失败时 rating 留空，不影响其他资料写入。
  const rating = await fetchRating(appid)

  const req = d.pc_requirements || {}
  return {
    steam: {
      appId: appid,
      developer: (d.developers || []).join('、'),
      publisher: (d.publishers || []).join('、'),
      releaseDate: d.release_date?.date || '',
      genres: (d.genres || []).map((g) => g.description).filter(Boolean),
      languages: stripHtml(d.supported_languages || '').replace(/\*/g, ''),
      summary: stripHtml(d.short_description || ''),
      description: stripHtml(d.about_the_game || ''),
      screenshots: (d.screenshots || []).map((s) => s.path_full).filter(Boolean),
      requirements: {
        minimum: parseRequirements(typeof req === 'object' ? req.minimum : ''),
        recommended: parseRequirements(typeof req === 'object' ? req.recommended : ''),
      },
      price: d.is_free
        ? { free: true, currency: '', final: 0, discountPercent: 0 }
        : d.price_overview
          ? {
              free: false,
              currency: d.price_overview.currency || '',
              final: (d.price_overview.final || 0) / 100,
              initial: (d.price_overview.initial || 0) / 100,
              discountPercent: d.price_overview.discount_percent || 0,
            }
          : null,
      rating,
      storeUrl: `https://store.steampowered.com/app/${appid}/`,
      fetchedAt: new Date().toISOString(),
    },
    enName,
    steamName: d.name || '',
  }
}

const resources = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))

// ── 批量模式：给所有带 steamAppID 且还没有 steam 数据的资源补资料 ──
// 同一个 AppID 只请求一次（多条资源共用时分发同一份）；每个 AppID 之间留间隔；
// 单个失败只记录、跳过，不中断整批；每 10 个 AppID 落盘一次，中断了也不白跑。
if (batch) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const delay = Number(opt('--delay')) || 700
  const pending = resources.filter((r) => r.steamAppID && !r.steam)
  const byAppid = new Map()
  for (const r of pending) {
    if (!byAppid.has(r.steamAppID)) byAppid.set(r.steamAppID, [])
    byAppid.get(r.steamAppID).push(r)
  }
  console.log(`批量模式：${pending.length} 条资源待补，共 ${byAppid.size} 个唯一 AppID，间隔 ${delay}ms`)
  let done = 0
  let filled = 0
  const failures = []
  for (const [aid, list] of byAppid) {
    done++
    try {
      const { steam, enName } = await fetchSteam(aid)
      for (const r of list) {
        r.steam = steam
        if (!r.enTitle && enName && enName !== r.title) r.enTitle = enName
      }
      filled += list.length
    } catch (e) {
      failures.push({ appid: aid, ids: list.map((r) => r.id), error: String(e?.message || e) })
      console.error(`✗ AppID ${aid}（${list.map((r) => r.id).join(', ')}）: ${e?.message || e}`)
    }
    if (done % 10 === 0 || done === byAppid.size) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(resources, null, 2) + '\n', 'utf8')
      console.log(`进度 ${done}/${byAppid.size}，已补 ${filled} 条，失败 ${failures.length} 个 AppID（已落盘）`)
    }
    if (done < byAppid.size) await sleep(delay)
  }
  console.log(`\n批量完成：成功补 ${filled} 条资源；失败 ${failures.length} 个 AppID`)
  if (failures.length) {
    console.log('失败清单（这些资源维持原样，之后可单独重试）:')
    failures.forEach((f) => console.log(`  AppID ${f.appid} → ${f.ids.join(', ')}：${f.error}`))
  }
  process.exit(0)
}

// ── 评价回填模式：只给已有 steam 资料但 rating 为空的资源补评价 ──
// 不动 steam 其他字段；同一个 AppID 只请求一次；每 10 个 AppID 落盘一次，中断了也不白跑。
if (refillRating) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const delay = Number(opt('--delay')) || 1500
  const pending = resources.filter((r) => r.steamAppID && r.steam && !r.steam.rating)
  const byAppid = new Map()
  for (const r of pending) {
    if (!byAppid.has(r.steamAppID)) byAppid.set(r.steamAppID, [])
    byAppid.get(r.steamAppID).push(r)
  }
  console.log(`评价回填：${pending.length} 条资源缺评价，共 ${byAppid.size} 个唯一 AppID，间隔 ${delay}ms`)
  let done = 0
  let filled = 0
  const failures = []
  for (const [aid, list] of byAppid) {
    done++
    try {
      const rating = await fetchRating(aid)
      if (rating) {
        for (const r of list) r.steam.rating = rating
        filled += list.length
      } else {
        failures.push({ appid: aid, ids: list.map((r) => r.id), error: '无评价数据（可能暂无评测或页面未返回）' })
      }
    } catch (e) {
      failures.push({ appid: aid, ids: list.map((r) => r.id), error: String(e?.message || e) })
    }
    if (done % 10 === 0 || done === byAppid.size) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(resources, null, 2) + '\n', 'utf8')
      console.log(`进度 ${done}/${byAppid.size}，已补 ${filled} 条，失败 ${failures.length} 个 AppID（已落盘）`)
    }
    if (done < byAppid.size) await sleep(delay)
  }
  console.log(`\n评价回填完成：成功补 ${filled} 条资源；失败 ${failures.length} 个 AppID`)
  if (failures.length) {
    console.log('失败清单（这些资源维持原样，之后可单独重试）:')
    failures.forEach((f) => console.log(`  AppID ${f.appid} → ${f.ids.join(', ')}：${f.error}`))
  }
  process.exit(0)
}

let target = null
if (targetId) {
  target = resources.find((r) => r.id === targetId) || null
  if (!target) {
    console.error(`找不到资源 id: ${targetId}`)
    process.exit(1)
  }
  if (target.steamAppID != null && target.steamAppID !== appid) {
    console.error(`资源 ${targetId} 已有 steamAppID=${target.steamAppID}，与传入的 ${appid} 不一致，已中止（如确认要改请先清掉旧值）`)
    process.exit(1)
  }
} else {
  const hits = resources.filter((r) => r.steamAppID === appid)
  if (hits.length === 0) {
    console.error(`没有资源的 steamAppID=${appid}。请用 --id 指定要补资料的资源，或先在后台给它填 steamAppID。`)
    process.exit(1)
  }
  if (hits.length > 1) {
    console.error(`steamAppID=${appid} 命中 ${hits.length} 条，请用 --id 指定其中一条：`)
    hits.forEach((h) => console.error(`  ${h.id}  ${h.title}`))
    process.exit(1)
  }
  target = hits[0]
}

const { steam, enName, steamName } = await fetchSteam(appid)

console.log(`目标资源: ${target.id} 《${target.title}》`)
console.log(`Steam:    《${steamName}》 AppID ${appid}`)
console.log(`  开发/发行: ${steam.developer} / ${steam.publisher} · 发行 ${steam.releaseDate}`)
console.log(`  截图 ${steam.screenshots.length} 张 · 配置 最低 ${steam.requirements.minimum.length} 条 / 推荐 ${steam.requirements.recommended.length} 条`)
console.log(`  评价: ${steam.rating ? `${steam.rating.positiveRate}% 好评（${steam.rating.totalReviews} 条）` : '无'}`)
console.log(`  介绍 ${steam.description.length} 字，简介 ${steam.summary.length} 字`)
if (!target.enTitle && enName && enName !== target.title) console.log(`  将补 enTitle: ${enName}`)

if (!write) {
  console.log('\n预览模式，未写文件。确认无误后加 --write 写回 resources.json。')
  process.exit(0)
}

target.steamAppID = appid
if (!target.enTitle && enName && enName !== target.title) target.enTitle = enName
target.steam = steam
fs.writeFileSync(DATA_FILE, JSON.stringify(resources, null, 2) + '\n', 'utf8')
console.log(`\n✅ 已写入 ${path.relative(process.cwd(), DATA_FILE)}，请接着跑 npm run validate 确认数据校验通过。`)
