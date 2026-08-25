#!/usr/bin/env node
/**
 * scripts/gen-commits.js
 * 从 git log 生成 public/data/commits.json（首页"最新动态"数据源）
 * CI 在 build 前运行；本地 push 前也可手动跑
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../public/data/commits.json')

let log = ''
try {
  log = execSync('git log -30 --pretty=format:%H%x09%ad%x09%s --date=iso-strict', {
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  })
} catch {
  // 不是 git 仓库或没历史：输出空数组，不阻塞构建
  fs.writeFileSync(OUT, '[]')
  console.log('⚠️ 无 git 历史，commits.json 置空')
  process.exit(0)
}

const commits = log
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [hash, date, ...msg] = line.split('\t')
    return {
      hash: hash.slice(0, 7),
      date,
      message: msg.join('\t'),
      url: `https://github.com/xi7ang/GameHub/commit/${hash}`,
    }
  })

fs.writeFileSync(OUT, JSON.stringify(commits, null, 2))
console.log(`✅ commits.json 已生成: ${commits.length} 条`)
