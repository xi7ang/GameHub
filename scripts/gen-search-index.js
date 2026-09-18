#!/usr/bin/env node
/**
 * scripts/gen-search-index.js
 * 从 public/data/resources.json 生成搜索索引 public/data/search-index.json。
 *
 * 为什么在构建期生成：拼音（全拼 + 首字母）在浏览器里算就要塞一个拼音库进包；
 * 索引里预计算好，运行时零依赖，而且首页搜索只需拉 ~110KB 的索引，
 * 不必为搜索拉 600KB 的 resources.json。
 *
 * 记录字段含义见 src/lib/search-core.js 的 ID/RAW_TITLE/... 常量——
 * 匹配逻辑共用同一份实现，这里只负责算拼音和落盘。生成物随仓库提交。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pinyin } from 'pinyin-pro'
import { makeRecord, INDEX_VERSION } from '../src/lib/search-core.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, '../public/data/resources.json')
const OUT = path.join(__dirname, '../public/data/search-index.json')

const resources = JSON.parse(fs.readFileSync(SRC, 'utf8'))

// 只有含中文的标题才需要拼音：纯拉丁标题（实测 3/1156）算了纯属浪费体积
const HAS_CJK = /[\u4e00-\u9fa5]/
let withPinyin = 0

const items = resources.map((r) => {
  let py = null
  if (HAS_CJK.test(String(r.title || ''))) {
    withPinyin++
    py = {
      full: pinyin(r.title, { toneType: 'none', type: 'array' }).join(''),
      init: pinyin(r.title, { toneType: 'none', pattern: 'first', type: 'array' }).join(''),
    }
  }
  return makeRecord(r, py)
})

fs.writeFileSync(OUT, JSON.stringify({ v: INDEX_VERSION, items }))

const kb = (fs.statSync(OUT).size / 1024).toFixed(0)
const srcKb = (fs.statSync(SRC).size / 1024).toFixed(0)
console.log(
  `✅ search-index.json 已生成：${items.length} 条（含拼音 ${withPinyin}）· ${kb} KB（源 ${srcKb} KB）`
)
