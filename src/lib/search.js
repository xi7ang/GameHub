// src/lib/search.js
// 浏览器侧的搜索入口：加载构建期生成的 search-index.json，交给 search-core 做级联匹配。
// 组件只调这里，不自己写 filter —— 之前 SearchBox.vue 与 Search.vue 各抄一份 includes
// 逻辑，改一处漏一处是必然的。
//
// 索引不可用时回退到全量 resources.json 上的归一化 includes（search-core 的 searchFallback）。
// 搜索挂了比搜索不模糊严重得多。
import { BUILD_ID } from './version.js'
import {
  INDEX_VERSION,
  ID,
  RAW_TITLE,
  CAT,
  prepareRecords,
  searchIndex,
  searchFallback,
} from './search-core.js'

const BASE = import.meta.env.BASE_URL // '/'
// 数据文件在 Pages/Cloudflare 上是强缓存，必须带构建号，否则新索引赖在用户浏览器里
const CB = `v=${encodeURIComponent(BUILD_ID || 'dev')}`

let records = null
let pending = null
let loadFailed = false

/** 索引记录数组（内存态）；未加载完成时为 null */
export function getRecords() {
  return records
}

/** 索引是否已判定不可用（此时调用方应走全量兜底） */
export function isIndexUnavailable() {
  return loadFailed
}

/**
 * 确保索引已加载。并发调用共享同一次 fetch。
 * @returns {Promise<any[]|null>} 失败返回 null（不抛，调用方走兜底）
 */
export function ensureIndex() {
  if (records) return Promise.resolve(records)
  if (pending) return pending
  pending = fetch(`${BASE}data/search-index.json?${CB}`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    })
    .then((data) => {
      if (!data || data.v !== INDEX_VERSION || !Array.isArray(data.items) || !data.items.length) {
        throw new Error('索引结构异常')
      }
      records = prepareRecords(data.items)
      return records
    })
    .catch((e) => {
      loadFailed = true
      console.warn('[search] 索引不可用，已回退全量匹配:', e)
      return null
    })
    .finally(() => {
      pending = null
    })
  return pending
}

/** 在已加载的索引上搜索；索引未就绪返回 null */
export function search(query, opts) {
  if (!records) return null
  return searchIndex(records, query, opts)
}

/** 全量兜底搜索（索引挂掉时用） */
export function searchOnResources(resources, query, opts) {
  return searchFallback(resources, query, opts)
}

/** 索引记录 → 下拉/列表展示所需的最小对象 */
export function toHit(rec) {
  return { id: rec[ID], title: rec[RAW_TITLE], category: rec[CAT] }
}

export { ID, RAW_TITLE, CAT }
