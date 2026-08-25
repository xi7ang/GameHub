#!/usr/bin/env node
/**
 * scripts/clean-titles.js — 标题清洗 v3
 * 管线：
 *   1. 删除 (1) 去重后缀
 *   2. 提取《》主标题（书名号内容 = 权威游戏名，保冒号等内部结构）
 *   3. 长短语噪声子串删除（最长优先，防黏连噪声如"最新安卓手机完整版"）
 *   4. 版本号提取 → desc
 *   5. 残留 token 分类：噪声剔除 / 特性进 desc+tags / 英文词收进 enTitle / 描述词进 desc
 *   6. 书名号存在 → 标题=书名内容（描述词全进 desc）；无书名号 → 标题=保留词
 *   7. 清洗后重复标题加 (2)(3)
 * 用法：node scripts/clean-titles.js [--write]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, '../public/data/resources.json')
const WRITE = process.argv.includes('--write')

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))

// ── 长短语噪声（子串删除，按长度降序；"重制版/威力加强版/年度版/黄金版"是官方命名，保留）──
const NOISE_PHRASES = [
  '泰拉瑞亚联动更新', '每日更新', '最新安卓', '安卓最新', 'Steam移植', 'steam移植',
  'Switch移植', 'switch移植', '豪华中文版', 'MOD菜单版', '无限金币版', '无限货币版',
  '无限金钱版', 'PC+手机', 'PC和手机', 'PC手机', '支持安卓', '支持PC', '手机运行',
  '电脑运行', '解压即玩', '含金手指', '完美运行', '免费下载', '大合集', '联动更新',
  'mod整合', '破解版', '汉化版', '中文版', '安卓版', '手机版', '联机版', '豪华版',
  '完整版', '绿色版', '纯搬运', '免付费', '免费版', '内测版', '正式版', '官方版',
  '最新版', '高清版', '免安装', '移植', '搬运', '下载', 'xg器', '高好评', '高评分',
]
const NOISE_PHRASES_SORTED = [...NOISE_PHRASES].sort((a, b) => b.length - a.length)

// ── 精确噪声 token ──
const NOISE_SET = new Set([
  '安卓', '手机', '版', '最新', '下载', '免费', '完整', 'PC', 'NS', 'GOG', 'APK',
  'steam', 'Steam', '每日更新', '支持', '运行', '版本', '游戏', '完整版',
])
// token 前缀噪声（黏连残留，如"版下载"）
const PREFIX_NOISE = /^(版|下载|安卓|手机|最新|免费|完整|移植|破解|搬运|支持|运行|版本)/

// ── 特性词 → desc/tags（按长度降序）──
const FEATURES = [
  ['联机补丁', '联机补丁'], ['无限金币', '无限金币'], ['无限货币', '无限货币'],
  ['无限金钱', '无限金钱'], ['金手指', '金手指'], ['修改器', '修改器'],
  ['MOD菜单', 'MOD菜单'], ['模拟器', '模拟器'], ['学习版', '学习版'],
  ['联机', '联机'], ['单机', '单机'], ['汉化', '汉化'], ['破解', '破解'],
  ['中文', '中文'], ['MOD', 'MOD'], ['mod', 'MOD'], ['DLC', 'DLC'],
  ['双人', '双人'], ['存档', '存档'], ['绿色', '绿色'],
]
const FEATURES_SORTED = [...FEATURES].sort((a, b) => b[0].length - a[0].length)

const VERSION_RE = /(?:Build\.?\s*)?v?\d+\.\d+(?:\.\d+)*(?:[-_]\d+)?|Build\.\d{5,}/gi
const EN_RE = /[A-Za-z][A-Za-z0-9&:'\-.\s]*$/

function extractFeatures(text) {
  const found = []
  for (const [k, label] of FEATURES_SORTED) {
    if (text.includes(k) && !found.includes(label)) found.push(label)
  }
  return found
}

function clean(raw) {
  const orig = raw.trim()
  let t = orig

  // 1. 去重后缀
  t = t.replace(/[（(]\d+[)）]\s*$/, '')

  // 2. 提取《》内容（权威游戏名）
  const books = t.match(/《([^》]+)》/g)
  let bookText = books ? books.map((b) => b.replace(/[《》]/g, '')).join(' ') : ''
  const bookVersions = (bookText.match(VERSION_RE) || []).map((v) => v.trim())
  bookText = bookText.replace(VERSION_RE, ' ').replace(/\s+/g, ' ').trim()

  // 3. 残留部分
  let residue = books ? t.replace(/《[^》]+》/g, '') : t
  residue = residue.replace(/\s+/g, ' ').trim()

  // 4. 版本号
  const versions = [...new Set([...bookVersions, ...(residue.match(VERSION_RE) || []).map((v) => v.trim())])]
  residue = residue.replace(VERSION_RE, ' ')

  // 5. 长短语噪声删除
  for (const p of NOISE_PHRASES_SORTED) {
    residue = residue.split(p).join(' ')
  }

  // 6. token 分类
  const tokens = residue.split(/[\s,，、:：;；|｜+＋()（）【】\[\]!！~～]+/).filter(Boolean)
  const keep = []
  const feats = []
  const enParts = []
  const descParts = []

  for (let tok of tokens) {
    tok = tok.trim()
    if (!tok) continue
    if (NOISE_SET.has(tok)) continue
    if (/^[A-Za-z]$/.test(tok)) continue // 单字母前缀
    if (/^\d+$/.test(tok) && tok.length <= 5) continue // 孤立数字
    if (isVersion(tok)) { versions.push(tok); continue }
    if (PREFIX_NOISE.test(tok)) continue // 前缀噪声残留
    tok = tok.replace(/(最新|完整|下载|版本|支持)$/, '') // 后缀噪声残留
    if (!tok) continue

    // 特性词（独立 token 且短）
    const feat = FEATURES_SORTED.find(([k]) => tok.length <= 10 && tok.toLowerCase().includes(k.toLowerCase()))
    if (feat) { feats.push(feat[1]); continue }

    // 英文词
    if (/^[A-Za-z0-9&:'\-.\s]+$/.test(tok)) {
      const cleanTok = tok.replace(/v?\d[\d.]{3,}/g, '').trim() // 剔除版本残留
      if (cleanTok.length >= 2) enParts.push(cleanTok)
      continue
    }

    keep.push(tok)
  }

  // 7. 组装
  let title
  if (bookText) {
    // 书名号内容是权威游戏名；多余描述词全部进 desc，避免标题/描述重复
    title = bookText
    descParts.push(...keep)
  } else {
    title = keep.join(' ') || orig
  }
  title = title.replace(/\s+/g, ' ').trim()

  // 8. enTitle：必须含大写字母或 ≥2 个词，且不是版本号
  let enTitle = ''
  if (enParts.length && /[\u4e00-\u9fa5]/.test(title)) {
    const cand = enParts.join(' ').replace(/\s+/g, ' ').trim()
    if (cand.length >= 3 && !/^v?\d[\d.]+$/i.test(cand) && (/[A-Z]/.test(cand) || enParts.length >= 2)) {
      enTitle = cand
    }
  }

  // 9. desc = 版本 + 特性 + 描述词
  const allFeats = [...new Set([...feats, ...extractFeatures(orig)])].slice(0, 5)
  const verStr = versions.length ? `版本 ${[...new Set(versions)].join(' ')}` : ''
  const desc = [verStr, ...allFeats, ...descParts].filter(Boolean).join(' · ')

  const changed = title !== orig || enTitle !== ''
  return { title, enTitle, desc, tags: allFeats, changed }
}

function isVersion(tok) {
  return /^v?\d+\.\d+(\.\d+)*$/i.test(tok) || /^build\.?\d*$/i.test(tok) || /^v?\d[\d.]{4,}$/i.test(tok)
}

// ── 执行 ──
let changed = 0
let dupFixed = 0
const titleCount = new Map()
const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00')

for (const r of data) {
  const c = clean(r.title)
  if (c.changed) changed++
  r.title = c.title
  if (c.enTitle && !r.enTitle) r.enTitle = c.enTitle
  if (c.desc && !r.desc) r.desc = c.desc
  if (c.tags.length && !r.tags?.length) r.tags = c.tags

  const key = `${r.category}|${r.title}`
  const n = (titleCount.get(key) || 0) + 1
  titleCount.set(key, n)
  if (n > 1) {
    r.title = `${r.title}(${n})`
    dupFixed++
  }
  r.updatedAt = nowIso
}

console.log(`总资源: ${data.length} | 标题有改动: ${changed} | 重复加后缀: ${dupFixed}`)
console.log(`提取英文名: ${data.filter((r) => r.enTitle).length} | 生成 desc: ${data.filter((r) => r.desc).length} | 生成 tags: ${data.filter((r) => r.tags?.length).length}`)

console.log('\n--- 抽样（前 30 条）---')
data.slice(0, 30).forEach((r) => {
  console.log(`[${r.category}] ${r.title}${r.enTitle ? ' | EN: ' + r.enTitle : ''}${r.desc ? ' | ' + r.desc : ''}`)
})

console.log('\n--- 重点复查 ---')
for (const kw of ['幻兽帕鲁', '超级忍', '攀爬动物', '机械制造者', '死亡细胞', '地铁2055', '鬼谷八荒', '海之号角', '古墓丽影', '生化危机', '全面战争']) {
  const r = data.find((x) => x.title.includes(kw))
  if (r) console.log(`[${r.category}] ${r.title}${r.enTitle ? ' | EN: ' + r.enTitle : ''}${r.desc ? ' | ' + r.desc : ''}`)
}

if (WRITE) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
  console.log('\n✅ 已写入', DATA_FILE)
} else {
  console.log('\n⚠️ dry-run 模式，未写入。确认无误后加 --write 执行')
}
