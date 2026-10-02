// src/composables/useFavorites.js
// 收藏 / 追更：纯本地能力（localStorage），站点无后端。
//
// 数据结构：
//   gh_favs        → [{ id, title, cover, addedAt, updatedAt, favAt }]，上限 200，超出淘汰最旧
//   gh_follow_cats → { [catKey]: lastSeenAt(ISO) }，lastSeenAt = 用户上次「看」该分类的时间
//
// 容错：所有 localStorage 访问都 try/catch。隐私模式 / 存储被禁用时降级为「仅本次会话内存生效」，
// 绝不因为读不到存储而抛错白屏。
import { reactive, computed } from 'vue'

const FAV_KEY = 'gh_favs'
const FOLLOW_KEY = 'gh_follow_cats'
const FAV_MAX = 200

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const val = JSON.parse(raw)
    return val == null ? fallback : val
  } catch (e) {
    return fallback
  }
}
function writeLS(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
    return true
  } catch (e) {
    return false
  }
}

// 模块级单例：同一页面内所有组件共享同一份内存状态（与 useData / useTheme 同一风格）
const savedFavs = readLS(FAV_KEY, [])
const savedFollows = readLS(FOLLOW_KEY, {})
const state = reactive({
  favs: Array.isArray(savedFavs) ? savedFavs : [],
  follows: savedFollows && typeof savedFollows === 'object' && !Array.isArray(savedFollows) ? savedFollows : {},
})

function persistFavs() { writeLS(FAV_KEY, state.favs) }
function persistFollows() { writeLS(FOLLOW_KEY, state.follows) }

// ── 收藏 ──────────────────────────────────────────────
function isFav(id) {
  return !!id && state.favs.some((f) => f.id === id)
}

// 切换收藏：返回切换后的状态（true=已收藏）
function toggleFav(r) {
  if (!r || !r.id) return false
  const i = state.favs.findIndex((f) => f.id === r.id)
  if (i >= 0) {
    state.favs.splice(i, 1)
    persistFavs()
    return false
  }
  state.favs.unshift({
    id: r.id,
    title: r.title || '',
    cover: r.cover || '',
    addedAt: r.addedAt || '',
    updatedAt: r.updatedAt || '',
    favAt: new Date().toISOString(),
  })
  if (state.favs.length > FAV_MAX) state.favs.splice(FAV_MAX) // 淘汰最旧
  persistFavs()
  return true
}

function removeFav(id) {
  const i = state.favs.findIndex((f) => f.id === id)
  if (i < 0) return
  state.favs.splice(i, 1)
  persistFavs()
}

function listFavs() { return state.favs.slice() } // 已按收藏时间倒序
function favCount() { return state.favs.length }

// ── 追分类 ────────────────────────────────────────────
function isFollowing(catKey) {
  return !!catKey && Object.prototype.hasOwnProperty.call(state.follows, catKey)
}
function toggleFollowCat(catKey) {
  if (!catKey) return false
  if (isFollowing(catKey)) {
    delete state.follows[catKey]
    persistFollows()
    return false
  }
  state.follows[catKey] = new Date().toISOString()
  persistFollows()
  return true
}
// 用户进入某分类后调用：把 lastSeenAt 推到当前，新货计数归零
function markFollowSeen(catKey) {
  if (!catKey || !isFollowing(catKey)) return
  state.follows[catKey] = new Date().toISOString()
  persistFollows()
}
function followedCats() { return Object.keys(state.follows) }

// 某分类「上次看之后」的新增条数。
// items 为数组，元素需含 { category, addedAt }（全量资源或首页聚合池都可）。
function newCountFor(catKey, items) {
  const since = state.follows[catKey]
  if (!catKey || !since) return 0
  const t0 = Date.parse(since)
  if (Number.isNaN(t0)) return 0
  const list = Array.isArray(items) ? items : []
  let n = 0
  for (const it of list) {
    if (!it || it.category !== catKey) continue
    const t = Date.parse(it.addedAt || '')
    if (!Number.isNaN(t) && t > t0) n++
  }
  return n
}
// 各「已追」分类的未看新增数汇总
function followNewCounts(items) {
  const out = {}
  for (const k of Object.keys(state.follows)) out[k] = newCountFor(k, items)
  return out
}

export function useFavorites() {
  return {
    favs: computed(() => state.favs),
    follows: computed(() => state.follows),
    isFav,
    toggleFav,
    removeFav,
    listFavs,
    favCount,
    isFollowing,
    toggleFollowCat,
    markFollowSeen,
    followedCats,
    newCountFor,
    followNewCounts,
  }
}
