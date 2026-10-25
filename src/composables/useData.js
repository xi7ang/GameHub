// src/composables/useData.js
// 数据加载：fetch public/data/*.json，全局单例缓存
import { reactive } from 'vue'
import { buildHomeShape } from '../lib/homeShape.js'
import { BUILD_ID } from '../lib/version.js'

const BASE = import.meta.env.BASE_URL // '/'

const state = reactive({
  resources: [],
  categories: [],
  site: null,
  commits: [],
  home: null, // 首页精简数据（home.json），仅首页使用
  detail: null, // 详情页当前资源（detail/<id>.json 全量单条）
  detailIndex: null, // 详情页瘦索引（resource-index.json 的 items，卡片字段级）
  loading: true,
  error: null,
})

let loaded = false
let homeLoaded = false
let detailLoadedFor = null

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

// ── 强缓存清除标记 ──────────────────────────────────────────
// GitHub Pages / Cloudflare 对 *.json 是强缓存（max-age=600）。用构建号当 key：
// 每次部署必变 → 数据文件 URL 跟着变，浏览器与边缘节点必然回源，用户无需强刷。
// 构建号由 scripts/inject-build.js 注入 HTML（window.__BUILD_ID__），与 version.json 同源。
const CACHE_KEY = BUILD_ID || 'dev'
// site.json 也要带 key：它是公告/配置的直接来源，之前唯一没被 bust 的数据文件
const CB = `v=${encodeURIComponent(CACHE_KEY)}`

async function load() {
  if (loaded) return state
  const cb = CB
  try {
    const [res, cats, site, commits] = await Promise.all([
      fetch(`${BASE}data/resources.json?${cb}`).then((r) => r.json()),
      fetch(`${BASE}data/categories.json?${cb}`).then((r) => r.json()),
      fetch(`${BASE}data/site.json?${cb}`).then((r) => r.json()),
      fetch(`${BASE}data/commits.json?${cb}`).then((r) => r.json()),
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

// 合集页专用：只需要分类表，把 category key 解析成中文名/emoji/gradient。
// 少了这一步，catLabel() 会回退成原始 key，卡片主标签会显示成 rpg / simulation 这种英文。
let catsLoaded = false
async function loadCategories() {
  if (catsLoaded) return state
  try {
    const cats = await fetch(`${BASE}data/categories.json?${CB}`).then((r) => r.json())
    state.categories = cats.sort((a, b) => a.order - b.order)
    catsLoaded = true
  } catch (e) {
    state.error = String(e)
  }
  return state
}

// 首页专用轻量加载器：只拉 home.json（~60KB）+ site.json + categories.json，
// 不再加载 568KB 全量 resources.json。home.json 缺失/损坏时兜底回退全量。
async function loadHome() {
  if (homeLoaded) return state
  try {
    const cb = CB
    const [home, cats, site] = await Promise.all([
      fetch(`${BASE}data/home.json?${cb}`).then((r) => r.json()),
      fetch(`${BASE}data/categories.json?${cb}`).then((r) => r.json()),
      fetch(`${BASE}data/site.json?${cb}`).then((r) => r.json()),
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
        fetch(`${BASE}data/resources.json?${cb}`).then((r) => r.json()),
        fetch(`${BASE}data/categories.json?${cb}`).then((r) => r.json()),
        fetch(`${BASE}data/site.json?${cb}`).then((r) => r.json()),
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

// 详情页专用轻量加载器：只拉「当前资源详情 + 瘦索引 + 分类/站点配置」，
// 不再拉全量 resources.json（3.4MB）。索引/详情由 scripts/gen-detail.js 在构建期生成。
// 任一步失败（旧部署没有生成物、文件缺失等）都回退全量 load()，保证详情页永远能开。
async function loadDetail(rawId) {
  if (detailLoadedFor === rawId && state.detail) return state
  const cb = CB
  try {
    const [index, cats, site] = await Promise.all([
      fetch(`${BASE}data/resource-index.json?${cb}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error('index ' + r.status)))),
      fetch(`${BASE}data/categories.json?${cb}`).then((r) => r.json()),
      fetch(`${BASE}data/site.json?${cb}`).then((r) => r.json()),
    ])
    const items = index?.items
    if (!Array.isArray(items)) throw new Error('resource-index 结构异常')
    state.detailIndex = items
    state.categories = cats.sort((a, b) => a.order - b.order)
    state.site = site
    applyBrandToDoc(site)
    // 先按完整 id 找；找不到且像 6 位短码时再按短码匹配（短码算法与 lib/short.js 一致，动态 import 避免循环依赖）
    let entry = items.find((x) => x.id === rawId)
    if (!entry && rawId && /^[0-9a-z]{6}$/i.test(rawId)) {
      const { shortId } = await import('../lib/short.js')
      entry = items.find((x) => shortId(x.id) === rawId.toLowerCase())
    }
    if (!entry) throw new Error('索引里没有这条资源')
    const detail = await fetch(`${BASE}data/detail/${entry.id}.json?${cb}`).then((r) =>
      r.ok ? r.json() : Promise.reject(new Error('detail ' + r.status))
    )
    state.detail = detail
    detailLoadedFor = rawId
  } catch (e) {
    // 兜底：回退全量加载，state.detail 从全量里取（找不到就是 null，页面走「不存在」分支）
    try {
      await load()
      let hit = state.resources.find((x) => x.id === rawId) || null
      if (!hit && rawId && /^[0-9a-z]{6}$/i.test(rawId)) {
        const { shortId } = await import('../lib/short.js')
        hit = state.resources.find((x) => shortId(x.id) === rawId.toLowerCase()) || null
      }
      state.detail = hit
      detailLoadedFor = rawId
    } catch (e2) {
      state.error = String(e2)
    }
  } finally {
    state.loading = false
  }
  return state
}

// 搜索页专用轻量加载器：只拉「瘦索引 + 分类/站点配置」，不再拉全量 resources.json（5.3MB）。
// 瘦索引（resource-index.json）由 scripts/gen-detail.js 在构建期生成，卡片字段与
// ResourceCard 实际读取的字段一一对应（id/title/enTitle/cover/category/tags/size/status/
// featured/addedAt/updatedAt/steam 评分摘要+发行日期），渲染结果与全量一致。
// 索引不可用时回退全量 load()，保证搜索页永远能开。
let searchLoaded = false
async function loadSearch() {
  if (searchLoaded) return state
  const cb = CB
  try {
    const [index, cats, site] = await Promise.all([
      fetch(`${BASE}data/resource-index.json?${cb}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error('index ' + r.status)))),
      fetch(`${BASE}data/categories.json?${cb}`).then((r) => r.json()),
      fetch(`${BASE}data/site.json?${cb}`).then((r) => r.json()),
    ])
    const items = index?.items
    if (!Array.isArray(items)) throw new Error('resource-index 结构异常')
    state.resources = items
    state.categories = cats.sort((a, b) => a.order - b.order)
    state.site = site
    applyBrandToDoc(site)
    searchLoaded = true
  } catch (e) {
    // 兜底：回退全量加载
    try {
      await load()
      searchLoaded = true
    } catch (e2) {
      state.error = String(e2)
    }
  } finally {
    state.loading = false
  }
  return state
}

export function useData() {
  return { state, load, loadHome, loadCategories, loadDetail, loadSearch, detectPlatform, extractPwd, parseLines, catLabel, catMeta }
}
