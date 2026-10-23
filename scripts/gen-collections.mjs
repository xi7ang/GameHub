#!/usr/bin/env node
/**
* scripts/gen-collections.mjs
* 生成首页「必玩合集」数据 public/data/collections.json（prebuild 调用，生成物随仓库提交）。
*
* 定版规则（2026-10-23 与站长确认）：
* 混合口碑线 + 官方榜交叉：全站必玩守 好评率 ≥95% 且评测数 ≥30000，取前 20；
* 排序：人工置顶(pin) 最前，其次 Steam 官方「最多游玩」榜在榜者（按榜位），其余按评测数降序。
* 一款游戏只能出现在一个榜单里：全站必玩先占，品类榜随后分配，
* 分配顺序按候选池从小到大（最稀缺的品类先挑，防被大品类抢空）；
* 品类榜口碑线放宽为 好评率 ≥90% 且评测数 ≥5000（独占后原线凑不满），每榜上限 12 款。
* 同一 AppID 多个资源只取一个（优先标题最干净的版本，其次单机版）。
* 合集定义与 pin/block 在 scripts/collections.config.json 里改，不用动代码：
* pin: { "<合集id>": [appid,...]} 破格入选（站内有该游戏即可，不受口碑线限制），按数组顺序置顶；
* 若该游戏已被先分配的榜单占用，会打警告并跳过（不重复优先）。
* block: [appid,...] 全站排除
* 「最多游玩」榜拉取失败（无网/被限流）时自动退化为纯评测数排序，不挡构建。
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath} from 'node:url'
import { slimCard} from '../src/lib/homeShape.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, '../public/data/resources.json')
const CFG = path.join(__dirname, 'collections.config.json')
const OUT = path.join(__dirname, '../public/data/collections.json')

const resources = JSON.parse(fs.readFileSync(SRC, 'utf8'))
const config = JSON.parse(fs.readFileSync(CFG, 'utf8'))
const pin = config.pin || {}
const block = new Set((config.block || []).map(Number))

// 同 AppID 去重：标题带打包/修改器等噪声词的靠后，再比清洗后标题长度，最后比分类优先级
const NOISE = /XG器|打包|修改器|单独|补丁|整合包|虚拟机|安卓|原版|国语配音|\(\d+\)|v\d|Build/i
const CAT_RANK = { pc: 0, online: 1, mobile: 2, mod: 3, other: 4}
const cleanLen = (t) => String(t || '').replace(/[（(].*?[)）]/g, '').length
const byAppId = new Map()
for (const r of resources) {
if (!r.steam?.appId) continue
const k = r.steam.appId
const score = [NOISE.test(r.title)? 1: 0, cleanLen(r.title), CAT_RANK[r.category]?? 9]
const cur = byAppId.get(k)
if (!cur || score.join() < cur.score.join()) byAppId.set(k, { score, r})
}
const library = [...byAppId.values()].map((v) => v.r)

const rating = (r) => r.steam?.rating || {}
const passes = (r, bar) =>
(rating(r).positiveRate?? 0) >= bar.rate && (rating(r).totalReviews?? 0) >= bar.reviews

// Steam 官方「最多游玩」榜（失败即空表，不挡构建）
let mostPlayed = new Map()
try {
const ctl = new AbortController()
const timer = setTimeout(() => ctl.abort(), 6000)
const res = await fetch('https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/', {
signal: ctl.signal,
})
clearTimeout(timer)
const j = await res.json()
mostPlayed = new Map((j.response?.ranks || []).map((x) => [x.appid, x.rank]))
console.log(`🎮 最多游玩榜已拉取：${mostPlayed.size} 条`)
} catch {
console.warn('⚠️ 最多游玩榜拉取失败，本次按纯评测数排序')
}

const used = new Set() // 已被某个榜单占用的 AppID（榜单不重复）
function buildCollection(def) {
const pinIds = (pin[def.id] || []).map(Number)
const inGenre = (r) =>!def.genre || (r.steam?.genres || []).includes(def.genre)
const pool = library.filter(
(r) => inGenre(r) &&!block.has(r.steam.appId) &&!used.has(r.steam.appId)
)
const pinned = []
for (const id of pinIds) {
const hit = pool.find((r) => r.steam.appId === id)
if (hit) pinned.push(hit)
else console.warn(`⚠️ pin 的 AppID ${id}（${def.name}）站内没有或已被其他榜单占用，跳过`)
}
const pinnedSet = new Set(pinned.map((r) => r.steam.appId))
const rest = pool
.filter((r) => passes(r, def.bar) &&!pinnedSet.has(r.steam.appId))
.sort((a, b) => {
const am = mostPlayed.get(a.steam.appId)
const bm = mostPlayed.get(b.steam.appId)
if (am && bm) return am - bm
if (am) return -1
if (bm) return 1
return (rating(b).totalReviews || 0) - (rating(a).totalReviews || 0)
})
const items = [...pinned,...rest].slice(0, def.limit || 20)
for (const r of items) used.add(r.steam.appId)
return {
id: def.id,
name: def.name,
emoji: def.emoji,
desc: def.desc,
display: def.display?? 99,
items: items.map((r) => ({
...slimCard(r),
mostPlayedRank: mostPlayed.get(r.steam.appId) || null,
})),
}
}

// 分配顺序：全站（无 genre）先行；品类榜按候选池从小到大
const defs = config.collections || []
const allDef = defs.filter((d) =>!d.genre)
const genreDefs = defs
.filter((d) => d.genre)
.map((d) => ({
d,
poolSize: library.filter(
(r) => (r.steam?.genres || []).includes(d.genre) && passes(r, d.bar) &&!block.has(r.steam.appId)
).length,
}))
.sort((a, b) => a.poolSize - b.poolSize)
.map((x) => x.d)

const built = [...allDef,...genreDefs].map(buildCollection)
built.sort((a, b) => a.display - b.display)
for (const c of built) delete c.display

const out = { generatedAt: new Date().toISOString().slice(0, 10), collections: built}
fs.writeFileSync(OUT, JSON.stringify(out))
for (const c of built) console.log(`🏆 ${c.name}：${c.items.length} 款`)
console.log(`✅ collections.json 已生成：${(fs.statSync(OUT).size / 1024).toFixed(1)} KB`)
