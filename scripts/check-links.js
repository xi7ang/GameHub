#!/usr/bin/env node
/**
 * scripts/check-links.js — 批量探测资源链接有效性（GitHub Actions 服务端运行）
 *
 * 对 resources.json 中 status=active 的资源逐个发 HEAD 请求，
 * 结果写入 public/data/link-report.json，后台"数据体检"页读取展示。
 *
 * 分类：
 *   ok   — 2xx/3xx
 *   warn — 403/429（网盘反爬常见，可能仍有效，需人工确认）
 *   fail — 4xx(除403/429)/5xx/网络错误/超时
 *
 * 用法：node scripts/check-links.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, '../public/data/resources.json')
const OUT_FILE = path.join(__dirname, '../public/data/link-report.json')

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
const targets = data.filter((r) => r.status === 'active')
const CONCURRENCY = 8
const TIMEOUT = 10000

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function probe(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT)
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept': '*/*',
      },
    })
    return { status: res.status, error: null }
  } catch (e) {
    return { status: 0, error: e.name === 'AbortError' ? 'timeout' : e.message }
  } finally {
    clearTimeout(timer)
  }
}

function classify(status) {
  if (status >= 200 && status < 400) return 'ok'
  if (status === 403 || status === 429 || status === 0) return 'warn'
  return 'fail'
}

// ── 并发探测 ──
const results = []
let cursor = 0
async function worker() {
  while (cursor < targets.length) {
    const idx = cursor++
    const r = targets[idx]
    const { status, error } = await probe(r.url)
    results.push({ id: r.id, title: r.title, url: r.url, status, error, cls: classify(status) })
    if ((idx + 1) % 50 === 0) console.log(`进度: ${idx + 1}/${targets.length}`)
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))

// ── 汇总 ──
const ok = results.filter((r) => r.cls === 'ok').length
const warn = results.filter((r) => r.cls === 'warn').length
const fail = results.filter((r) => r.cls === 'fail').length
const fails = results.filter((r) => r.cls === 'fail').map(({ id, title, url, status, error }) => ({ id, title, url, status, error }))

const report = {
  checkedAt: new Date().toISOString(),
  total: results.length,
  ok,
  warn,
  fail,
  fails: fails.slice(0, 200), // 只保留前 200 条，避免文件过大
  failTotal: fails.length,
}

fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2))
console.log(`✅ 检测完成: 总 ${results.length} | ok ${ok} | warn ${warn} | fail ${fail}（报告 ${fails.length} 条明细）`)
