// src/composables/useData.js
// 数据加载：fetch public/data/*.json，全局单例缓存
import { reactive } from 'vue'

const BASE = import.meta.env.BASE_URL // '/GameHub/'

const state = reactive({
  resources: [],
  categories: [],
  site: null,
  commits: [],
  loading: true,
  error: null,
})

let loaded = false

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

// 旧站格式批量解析： "标题 | https://...?pwd=xxx" 或 "标题 https://..."
function parseLines(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('---'))
    .map((line) => {
      // 格式A: 标题 | url
      const pipe = line.match(/^[-]?\s*(.+?)\s*\|\s*(https?:\/\/\S+)/)
      if (pipe) {
        return { title: pipe[1].trim(), url: pipe[2] }
      }
      // 格式B: 标题 url（同行）
      const same = line.match(/^(.+?)\s+(https?:\/\/\S+)$/)
      if (same) return { title: same[1].trim(), url: same[2] }
      // 格式C: 纯 url
      const pure = line.match(/^(https?:\/\/\S+)$/)
      if (pure) return { title: '点击访问资源', url: pure[1] }
      return null
    })
    .filter(Boolean)
    .map((r) => ({
      ...r,
      platform: detectPlatform(r.url),
      pwd: extractPwd(r.url),
    }))
}

function catLabel(key) {
  const c = state.categories.find((c) => c.key === key)
  return c ? c.name : key
}

function catMeta(key) {
  const c = state.categories.find((c) => c.key === key)
  return c || { key, name: key, emoji: '📦', gradient: ['#78909C', '#455A64'] }
}

async function load() {
  if (loaded) return state
  try {
    const [res, cats, site, commits] = await Promise.all([
      fetch(`${BASE}data/resources.json`).then((r) => r.json()),
      fetch(`${BASE}data/categories.json`).then((r) => r.json()),
      fetch(`${BASE}data/site.json`).then((r) => r.json()),
      fetch(`${BASE}data/commits.json`).then((r) => r.json()),
    ])
    state.resources = res.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''))
    state.categories = cats.sort((a, b) => a.order - b.order)
    state.site = site
    state.commits = commits
    loaded = true
  } catch (e) {
    state.error = String(e)
  } finally {
    state.loading = false
  }
  return state
}

export function useData() {
  return { state, load, detectPlatform, extractPwd, parseLines, catLabel, catMeta }
}
