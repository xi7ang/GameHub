// src/composables/useData.js
// 数据加载：fetch public/data/*.json，全局单例缓存
import { reactive } from 'vue'
import { buildHomeShape } from '../lib/homeShape.js'

const BASE = import.meta.env.BASE_URL // '/'

const state = reactive({
  resources: [],
  categories: [],
  site: null,
  commits: [],
  home: null, // 首页精简数据（home.json），仅首页使用
  loading: true,
  error: null,
})

let loaded = false
let homeLoaded = false

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
  return c || { key, name: key, emoji: '📦', gradient: ['#7d9cb3', '#4f6d8a'] }
}

// 品牌动态化：site.json 的 brand.name 为当前品牌名。各页面 *.html 静态 title/meta 里
// 写的是仓库默认品牌（=DEFAULT_BRAND），load 完成后统一替换成运行时品牌。
// 这样后台“一键换品牌”后，浏览器页签 + og:title 同步生效，无需改 7 个 html。
const DEFAULT_BRAND = 'GameHub'

function applyBrandToDoc(site) {
  const name = site?.brand?.name
  if (!name || name === DEFAULT_BRAND) return
  const swap = (s) => (s || '').split(DEFAULT_BRAND).join(name)
  document.title = swap(document.title)
  document.querySelectorAll('meta[property="og:title"], meta[name="description"]').forEach((m) => {
    m.setAttribute('content', swap(m.getAttribute('content')))
  })
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
    applyBrandToDoc(site)
    loaded = true
  } catch (e) {
    state.error = String(e)
  } finally {
    state.loading = false
  }
  return state
}

// 首页专用轻量加载器：只拉 home.json（~60KB）+ site.json + categories.json，
// 不再加载 568KB 全量 resources.json。home.json 缺失/损坏时兜底回退全量。
async function loadHome() {
  if (homeLoaded) return state
  try {
    const [home, cats, site] = await Promise.all([
      fetch(`${BASE}data/home.json`).then((r) => r.json()),
      fetch(`${BASE}data/categories.json`).then((r) => r.json()),
      fetch(`${BASE}data/site.json`).then((r) => r.json()),
    ])
    if (!home || !Array.isArray(home.coverPool)) throw new Error('home.json 结构异常')
    state.home = home
    state.categories = cats.sort((a, b) => a.order - b.order)
    state.site = site
    applyBrandToDoc(site)
    homeLoaded = true
  } catch (e) {
    // 兜底：home.json 不可用时回退加载全量 resources.json
    try {
      const [res, cats, site] = await Promise.all([
        fetch(`${BASE}data/resources.json`).then((r) => r.json()),
        fetch(`${BASE}data/categories.json`).then((r) => r.json()),
        fetch(`${BASE}data/site.json`).then((r) => r.json()),
      ])
      const sorted = res.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''))
      state.resources = sorted
      state.home = buildHomeShape(sorted)
      state.categories = cats.sort((a, b) => a.order - b.order)
      state.site = site
      applyBrandToDoc(site)
      loaded = true
      homeLoaded = true
    } catch (e2) {
      state.error = String(e2)
    }
  } finally {
    state.loading = false
  }
  return state
}

export function useData() {
  return { state, load, loadHome, detectPlatform, extractPwd, parseLines, catLabel, catMeta }
}
