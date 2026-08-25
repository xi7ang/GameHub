#!/usr/bin/env node
/**
 * scripts/clean-categories.js — 分类清洗 v2（保守修正型）
 *
 * v1 教训：全量重分类会误伤——
 *   - 标题清洗把"安卓/手机/Steam移植"等特征词删了，规则识别不出手游
 *   - tags/desc 含 "MOD" 字样的完整游戏被误判成 MOD 资源
 *   - "全面战争模拟器"这类完整游戏被误判成 emu
 *
 * v2 策略：保留迁移时的原分类为基准（基于未清洗标题的启发式，可信度尚可），
 * 只做【单向修正】明显错误：
 *   1. 非游戏 → other（事业单位/公务员/联考/答案/讲义 等）
 *   2. tool 清空重归（原 tool 3 条全是游戏）
 *   3. switch 特征 → switch（switch/nsz/xci/掌机/NS游戏）
 *   4. 手机强特征 → mobile（.apk/安卓/android/手机/手游/ios，仅在原分类非 mobile 时修正）
 *   5. 联机强特征 → online（联机/co-op/multiplayer/多人/对战，排除"联机补丁"这种补丁）
 *   6. 明确模拟器软件 → emu（平台+模拟器：psp/gba/nds/ps2/switch模拟器/yuzu/citra 等）
 *   7. 其余保持原分类不动
 *
 * 用法：node scripts/clean-categories.js [--write]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, '../public/data/resources.json')
const WRITE = process.argv.includes('--write')

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))

// 原分类权重（可信度）：mobile/pc 基于原始标题判断，基本可信
const KEEP_CATS = new Set(['pc', 'mobile', 'mod', 'online', 'emu', 'switch'])

function textOf(r) {
  return `${r.title} ${r.enTitle || ''} ${(r.tags || []).join(' ')} ${r.desc || ''}`
}

// ── 修正规则（返回新分类或 null=保持原分类）──
function fix(r) {
  const t = textOf(r)

  // 1. 非游戏 → other
  if (/事业单位|公务员|联考|教资|教师资格|考研|考公|考试|答案|讲义|课程|网课|教材|真题/.test(t)) {
    return 'other'
  }

  // 2. tool 清空重归：原 tool 全是游戏，按标题特征重判（desc/tags 里的"修改器"是游戏附带的，不算工具）
  if (r.category === 'tool') {
    if (/^(修改器|加速器|存档工具|游戏工具|工具箱)/.test(r.title.trim())) return 'tool'
    return 'pc' // 默认当单机游戏
  }

  // 3. Switch 特征 → switch（排除"switch模拟器"这种模拟器软件）
  if (/nsz|xci|掌机|任天堂switch|switch版|switch游戏|ns游戏/.test(t) && !/switch模拟器/.test(t)) {
    return 'switch'
  }

  // 4. 手机强特征 → mobile（仅修正非 mobile 的原分类）
  if (r.category !== 'mobile' && /\.apk|apk版|安卓|android|手机|手游|ios|steam移植|移植手游/.test(t)) {
    return 'mobile'
  }

  // 5. 联机强特征 → online（排除"联机补丁"，那是补丁归 mod）
  if (r.category !== 'online' && /(^|[\s\/(（【])联机([\s\/(（】,，]|$)|co-op|multiplayer|多人联机|合作模式|对战平台/.test(t) && !/联机补丁/.test(t)) {
    return 'online'
  }

  // 6. 明确模拟器软件 → emu（平台名+模拟器 或 知名模拟器名）
  if (/psp模拟器|ps2模拟器|ps3模拟器|gba模拟器|nds模拟器|3ds模拟器|switch模拟器|wii模拟器|yuzu|citra|retroarch|模拟器工具|安卓模拟器/.test(t)) {
    return 'emu'
  }

  // 7. 其余保持原分类
  return null
}

// ── 执行 ──
const stats = {}
const moves = []
const otherList = []
const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00')
const idSeq = {}

for (const r of data) {
  const old = r.category
  const next = fix(r)
  if (next && next !== old) {
    stats[old] = stats[old] || {}
    stats[old][next] = (stats[old][next] || 0) + 1
    moves.push({ id: r.id, title: r.title, old, next, reason: reasonOf(r) })
    r.category = next
    if (next === 'other') otherList.push(r.title)
  }
  // 重新生成 id（保持前缀与分类一致）
  const month = r.month || r.addedAt?.slice(0, 7)?.replace('-', '') || '202608'
  const key = `${r.category}-${month}`
  idSeq[key] = (idSeq[key] || 0) + 1
  r.id = `${key}-${String(idSeq[key]).padStart(4, '0')}`
  r.updatedAt = nowIso
}

function reasonOf(r) {
  const t = textOf(r)
  if (/事业单位|公务员|联考|答案|讲义|课程|教材|真题/.test(t)) return '非游戏'
  if (/nsz|xci|掌机|switch版|switch游戏/.test(t)) return 'switch特征'
  if (/\.apk|安卓|android|手机|手游|ios|steam移植/.test(t)) return '手机特征'
  if (/联机|co-op|multiplayer|多人|对战/.test(t)) return '联机特征'
  if (/模拟器/.test(t)) return '模拟器软件'
  return 'tool重归'
}

// ── 报告 ──
console.log('════════ 分类清洗报告 v2 ════════')
console.log(`总资源: ${data.length} | 迁移条数: ${moves.length}`)

console.log('\n--- 迁移矩阵（原 → 新）---')
for (const [old, map] of Object.entries(stats)) {
  const parts = Object.entries(map).map(([k, v]) => `${k}:${v}`).join(', ')
  console.log(`  ${old} → ${parts}`)
}

const finalCount = {}
for (const r of data) finalCount[r.category] = (finalCount[r.category] || 0) + 1
console.log('\n--- 清洗后分类分布 ---')
for (const [k, v] of Object.entries(finalCount).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`)
}

console.log(`\n--- 非游戏清单（${otherList.length} 条 → other 待审）---`)
otherList.forEach((t) => console.log(`  ⚠️ ${t}`))

console.log('\n--- 迁移明细抽样（每类最多 10 条）---')
const byNext = {}
for (const m of moves) {
  byNext[m.next] = byNext[m.next] || []
  byNext[m.next].push(m)
}
for (const [next, list] of Object.entries(byNext)) {
  console.log(`\n[${next}] 共 ${list.length} 条：`)
  list.slice(0, 10).forEach((m) => console.log(`  ${m.old} → ${m.next} (${m.reason}) | ${m.title.slice(0, 38)}`))
  if (list.length > 10) console.log(`  ...等 ${list.length} 条`)
}

if (WRITE) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
  console.log('\n✅ 已写入', DATA_FILE)
} else {
  console.log('\n⚠️ dry-run 模式，未写入。确认无误后加 --write 执行')
}
