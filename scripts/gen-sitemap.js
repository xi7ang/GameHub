#!/usr/bin/env node
/**
 * scripts/gen-sitemap.js — 生成 sitemap.xml 与 robots.txt
 *
 * 数据源：public/data/{resources,categories,site}.json
 * 输出：dist/sitemap.xml + dist/robots.txt（vite build 后由 postbuild 触发）
 * 站点 URL 以 site.json 的 url 字段为准，缺省 https://pan.devmini.space
 *
 * 与前端 src/lib/short.js 同算法的 6 位短码，保证详情链接一致。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'public/data')

// ── 站点域名 ──
let site = {}
try { site = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'site.json'), 'utf8')) } catch {}
const SITE_URL = (site.url || 'https://pan.devmini.space').replace(/\/+$/, '')

// ── 短码算法（与 src/lib/short.js 一致）──
function shortId(id) {
  let h = 2166136261
  const s = String(id)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return (h % 2176782336).toString(36).padStart(6, '0')
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function lastmod(iso) {
  if (!iso) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : ''
}

// ── 读取数据 ──
const resources = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'resources.json'), 'utf8'))
let categories = []
try { categories = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'categories.json'), 'utf8')) } catch {}

// ── URL 集合 ──
const urls = []
const add = (loc, { last = '', freq = 'weekly', pri = '0.5' } = {}) => {
  urls.push({ loc: `${SITE_URL}${loc}`, last, freq, pri })
}

// 首页
add('/', { last: lastmod(resources[0]?.updatedAt), freq: 'daily', pri: '1.0' })
// 分类页（仅展示中的分类，且取各月视图首页即不带 month 的聚合页）
for (const c of categories) {
  if (c.show === false) continue
  add(`/category.html?cat=${encodeURIComponent(c.key)}`, { freq: 'weekly', pri: '0.7' })
}
// 资源详情页（短码）
for (const r of resources) {
  if (r.status === 'inactive') continue
  add(`/resource.html?id=${shortId(r.id)}`, { last: lastmod(r.updatedAt), freq: 'monthly', pri: '0.6' })
}
// 静态页
add('/changelog.html', { freq: 'weekly', pri: '0.3' })
add('/disclaimer.html', { freq: 'yearly', pri: '0.2' })

// ── 写 sitemap.xml ──
const outDir = process.argv[2] || path.join(ROOT, 'dist')
fs.mkdirSync(outDir, { recursive: true })

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map((u) => {
    const last = u.last ? `\n    <lastmod>${esc(u.last)}</lastmod>` : ''
    return `  <url>\n    <loc>${esc(u.loc)}</loc>${last}\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`
  }),
  '</urlset>',
  '',
].join('\n')
fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml)

// ── 写 robots.txt ──
const robots = [
  'User-agent: *',
  'Allow: /',
  'Disallow: /admin.html',
  `Sitemap: ${SITE_URL}/sitemap.xml`,
  '',
].join('\n')
fs.writeFileSync(path.join(outDir, 'robots.txt'), robots)

console.log(`✅ sitemap.xml（${urls.length} 个 URL）+ robots.txt 已生成 → ${outDir}`)
