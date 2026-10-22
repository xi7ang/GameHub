#!/usr/bin/env node
/**
 * scripts/gen-detail.js
 * 从 public/data/resources.json 生成详情页专用数据：
 *   public/data/detail/<id>.json   每条资源一个全量文件（详情页按需拉，约几 KB）
 *   public/data/resource-index.json 全站瘦索引（卡片字段 + Steam 角标摘要，
 *                                   详情页用它算相关推荐、解析短码 id）
 *
 * 为什么拆：详情页原来每次打开都拉全量 resources.json（补完 Steam 数据后 3.4MB），
 * 拆完后首次打开只拉索引（约 500KB，带构建号强缓存、跨详情页复用）+ 单条详情（几 KB），
 * 之后再看其他详情只拉几 KB。resources.json 仍是唯一事实源，本脚本只做派生。
 *
 * 生成物不进 git（见 .gitignore），CI 构建时由 prebuild 现场生成；
 * 万一线上拿不到索引/详情文件，详情页会自动回退全量加载（useData.loadDetail）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { slimCard } from '../src/lib/homeShape.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../public/data')
const SRC = path.join(DATA_DIR, 'resources.json')
const DETAIL_DIR = path.join(DATA_DIR, 'detail')
const INDEX_OUT = path.join(DATA_DIR, 'resource-index.json')

const resources = JSON.parse(fs.readFileSync(SRC, 'utf8'))

fs.mkdirSync(DETAIL_DIR, { recursive: true })
const ids = new Set()
let bytes = 0
for (const r of resources) {
  ids.add(r.id)
  const s = JSON.stringify(r)
  bytes += s.length
  fs.writeFileSync(path.join(DETAIL_DIR, `${r.id}.json`), s)
}
// 清理已删除资源的残留详情文件，避免越积越多
let cleaned = 0
for (const f of fs.readdirSync(DETAIL_DIR)) {
  if (f.endsWith('.json') && !ids.has(f.slice(0, -5))) {
    fs.unlinkSync(path.join(DETAIL_DIR, f))
    cleaned++
  }
}

const index = { generatedAt: new Date().toISOString().slice(0, 10), items: resources.map(slimCard) }
fs.writeFileSync(INDEX_OUT, JSON.stringify(index))

const kb = (n) => (n / 1024).toFixed(1)
console.log(
  `✅ detail 数据已生成：${resources.length} 个详情文件（共 ${kb(bytes)} KB，均 ${kb(bytes / resources.length)} KB/个）+ resource-index.json ${kb(fs.statSync(INDEX_OUT).size)} KB${cleaned ? `，清理残留 ${cleaned} 个` : ''}`
)
