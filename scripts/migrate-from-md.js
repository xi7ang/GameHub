#!/usr/bin/env node
/**
 * scripts/migrate-from-md.js — 一次性迁移脚本
 * 读取旧站 docs/games/*.md，转换为新站 resources.json 格式
 * 迁移完即可删除（历史使命结束）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OLD_DIR = path.join(__dirname, '../../../xi7ang.github.io/docs/games')
const OUT = path.join(__dirname, '../public/data/resources.json')

if (!fs.existsSync(OLD_DIR)) {
  console.error('❌ 找不到旧站 games 目录:', OLD_DIR)
  process.exit(1)
}

function detectPlatform(url) {
  if (!url) return 'unknown'
  if (url.includes('pan.quark.cn') || url.includes('quark.cn')) return 'quark'
  if (url.includes('pan.baidu.com') || url.includes('baidu.com')) return 'baidu'
  if (url.includes('pan.xunlei.cn') || url.includes('xunlei.cn')) return 'xunlei'
  if (url.includes('alipan.com') || url.includes('aliyundrive.com') || url.includes('www.alipan.com')) return 'aliyun'
  if (url.includes('pan.uc.cn') || url.includes('uc.cn')) return 'uc'
  return 'unknown'
}

function extractPwd(url) {
  if (!url) return null
  const m = url.match(/[?&]pwd=([^&\s]+)/)
  return m ? m[1] : null
}

// 关键词启发式分类（粗略，管理员可在后台修正）
function guessCategory(title, desc) {
  const s = `${title} ${desc}`.toLowerCase()
  if (s.includes('.apk') || s.includes('手游') || s.includes('steam移植') || s.includes('安卓')) return 'mobile'
  if (s.includes('switch') || s.includes('nsz') || s.includes('xci')) return 'switch'
  if (s.includes('联机') || s.includes('co-op') || s.includes('online') || s.includes('multiplayer')) return 'online'
  if (s.includes('mod') || s.includes('补丁') || s.includes('dlc')) return 'mod'
  if (s.includes('模拟器') || s.includes('emulator') || s.includes('模拟')) return 'emu'
  if (s.includes('破解') || s.includes('工具') || s.includes('加速') || s.includes('修改器')) return 'tool'
  return 'pc'
}

const files = fs.readdirSync(OLD_DIR).filter((f) => /^\d{6}\.md$/.test(f)).sort()
const all = []
let idSeq = 1

for (const f of files) {
  const month = f.replace('.md', '')
  const content = fs.readFileSync(path.join(OLD_DIR, f), 'utf8')
  const lines = content.split('\n')

  for (const line of lines) {
    const raw = line.trim()
    if (!raw || raw.startsWith('#') || raw.startsWith('---') || raw.startsWith('```')) continue
    const pipe = raw.match(/^[-]?\s*(.+?)\s*\|\s*(https?:\/\/\S+)/)
    if (!pipe) continue
    const titleRaw = pipe[1].trim()
    const url = pipe[2]
    // 去掉行尾的"每日更新"等后缀噪声
    const title = titleRaw.replace(/每日更新$/, '').trim()
    if (!title) continue

    const category = guessCategory(title, url)
    // 直接拼 +08:00 字符串，不用 toISOString（会转 UTC 导致日期错位）
    const nowIso = `${month.slice(0, 4)}-${month.slice(4)}-01T00:00:00+08:00`
    all.push({
      id: `${category}-${month}-${String(idSeq++).padStart(4, '0')}`,
      title,
      enTitle: '',
      category,
      tags: [],
      platform: detectPlatform(url),
      url,
      pwd: extractPwd(url),
      size: '',
      sizeBytes: null,
      cover: '',
      desc: '',
      status: 'active',
      featured: false,
      addedAt: nowIso,
      updatedAt: nowIso,
      month,
    })
  }
  console.log(`  ${f}: ${all.filter((r) => r.month === month).length} 条`)
}

fs.writeFileSync(OUT, JSON.stringify(all, null, 2))
console.log(`✅ 迁移完成: ${all.length} 条资源 → ${OUT}`)
console.log('  分类分布:', JSON.stringify(all.reduce((m, r) => ((m[r.category] = (m[r.category] || 0) + 1), m), {})))
