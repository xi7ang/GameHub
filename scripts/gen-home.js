#!/usr/bin/env node
/**
 * scripts/gen-home.js
 * 从 public/data/resources.json 生成首页精简数据 public/data/home.json。
 * 首页只渲染 20 张卡片 + 几个计数，无需加载 568KB 全量资源。
 * CI build 前运行（见 package.json prebuild），生成物随仓库提交。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildHomeShape } from '../src/lib/homeShape.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, '../public/data/resources.json')
const OUT = path.join(__dirname, '../public/data/home.json')

const resources = JSON.parse(fs.readFileSync(SRC, 'utf8'))
const home = buildHomeShape(resources)
fs.writeFileSync(OUT, JSON.stringify(home))

const kb = (fs.statSync(OUT).size / 1024).toFixed(1)
const srcKb = (fs.statSync(SRC).size / 1024).toFixed(1)
console.log(
  `✅ home.json 已生成：${home.total} 条资源 · 封面池 ${home.coverPool.length} · 最新 ${home.latest.length} · ${kb} KB（源 ${srcKb} KB）`
)
