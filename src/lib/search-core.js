// src/lib/search-core.js
// 搜索匹配核心：归一化 + 级联分层匹配。
// 纯 JS、零依赖，运行时（src/lib/search.js）与构建脚本（scripts/gen-search-index.js、
// scripts/validate.js）共用同一份实现——搜索行为只有一处定义。
//
// 为什么是「级联命中即停」而不是加权求和：加权会让低级匹配污染高级结果。
// 实测反例：查询 "2055" 时子序列 2-0-5-5 会在 "v20251125" / "Build.25037305"
// 这类长数字串里随便命中；级联下第 3 层「包含」已命中，就不会再往下掉级。

// ── 索引记录字段下标（数组比对象省字节，字段含义只在这里定义一次）──
// 磁盘格式（search-index.json 里存的）：
//   [id, 原始标题, enTitle, tags 拼接, 摘要, category, 拼音全拼, 拼音首字母, 排序权重]
// 内存格式（prepareRecords() 展开后，TIERS 只认这个）：
//   [id, 原始标题, 归一化标题, 归一化 enTitle, 归一化 tags, 归一化摘要,
//    category, 拼音全拼, 拼音首字母, 排序权重]
// 归一化字段不落盘：它是纯函数推导，加载时算一遍即可，
// 省下重复存一份标题的体积（实测每个字节省 ~20KB raw）。
export const ID = 0
export const RAW_TITLE = 1 // 原始标题（展示与高亮用）
export const TITLE = 2 // 归一化标题（内存态）
export const EN = 3 // 归一化 enTitle（内存态）
export const TAGS = 4 // 归一化 tags（内存态）
export const DESC = 5 // 归一化摘要（内存态）
export const CAT = 6 // category key（本身已是小写 ascii）
export const PY = 7 // 拼音全拼（仅含中文标题的资源有值）
export const PYI = 8 // 拼音首字母
export const RANK = 9 // 排序权重：featured 高位 + updatedAt 的 YYYYMMDD

export const INDEX_VERSION = 1

// 磁盘格式下标（search-index.json 里实际存的位置）。
// 必须单独定义：内存格式比磁盘格式多一个「归一化标题」，
// 两套下标混用会静默错位（曾把拼音串读进 category、把 rank 读成 undefined）。
const D_ID = 0
const D_RAW_TITLE = 1
const D_EN = 2
const D_TAGS = 3
const D_DESC = 4
const D_CAT = 5
const D_PY = 6
const D_PYI = 7
const D_RANK = 8
export const DISK_FIELDS = 9

// 归一化：NFKC（全角→半角）→ 小写 → 去空白与常见标点。
// 中英文混排时把标点吃掉，所以 "死亡细胞_v20260616" 与 "死亡细胞v20260616" 等价。
const PUNCT_RE = /[\s\u00a0\-_·:：,，.。!！?？'"“”‘’()（）[\]{}【】<>/\\|+*&@#$%^~`;；]/g
export function normalize(s) {
  return String(s ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(PUNCT_RE, '')
}

// 纯 ASCII 查询才启用拼音层：中文查询走标题/标签层更准，
// 而且拼音首字母会误伤拉丁查询（实测 "DLC" → 独轮车上的独角兽 dlcsddjs）。
export function isAsciiQuery(q) {
  return /^[\x20-\x7e]+$/.test(q)
}

function updatedRank(r) {
  const d = String(r.updatedAt || '').slice(0, 10).replace(/-/g, '')
  const n = Number(d) || 0
  return (r.featured ? 100000000 : 0) + n
}

// 构造一条磁盘记录；py 由调用方算好传入（核心层不依赖拼音库）
export function makeRecord(r, py) {
  let tags = (r.tags || []).join(' ')
  let desc = String(r.desc || '').slice(0, 40)
  if (normalize(desc) === normalize(tags)) desc = '' // desc 常与 tags 重复，省字节
  return [
    String(r.id || ''),
    String(r.title || ''),
    String(r.enTitle || ''),
    tags,
    desc,
    String(r.category || ''),
    py?.full || '',
    py?.init || '',
    updatedRank(r),
  ]
}

// 磁盘记录 → 内存记录：归一化字段在这里算一次，不在每次按键里算。
// 归一化是纯函数，所以磁盘格式不含归一化字段不损失任何匹配能力。
export function prepareRecord(rec) {
  const rawTitle = String(rec[D_RAW_TITLE] || '')
  const tags = normalize(rec[D_TAGS])
  let desc = normalize(rec[D_DESC])
  if (desc === tags) desc = ''
  return [
    String(rec[D_ID] || ''),
    rawTitle,
    normalize(rawTitle),
    normalize(rec[D_EN]),
    tags,
    desc,
    String(rec[D_CAT] || ''),
    String(rec[D_PY] || ''),
    String(rec[D_PYI] || ''),
    Number(rec[D_RANK]) || 0,
  ]
}

// 批量展开磁盘记录（加载索引时调一次）。
// 形状断言：错位会静默产出垃圾结果，宁可判定索引不可用走全量兜底。
export function prepareRecords(records) {
  if (!Array.isArray(records) || !records.length) return []
  if (!Array.isArray(records[0]) || records[0].length !== DISK_FIELDS) {
    console.warn(`[search] 索引记录应为 ${DISK_FIELDS} 字段，实为 ${records[0]?.length}，判定索引不可用`)
    return []
  }
  return records.map(prepareRecord)
}

// 子序列（顺序出现即可）：仅中文查询、长度 ≥3 时启用。
// 2 字子序列对 1156 条中文标题几乎等价于「任意两个字按序出现」，是噪声机器，不做。
function isSubsequence(hay, needle) {
  let i = 0
  for (let k = 0; k < hay.length && i < needle.length; k++) {
    if (hay[k] === needle[i]) i++
  }
  return i === needle.length
}

// 编辑距离 ≤ max 判定，带长度差早退
export function editWithin(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false
  if (a === b) return true
  const m = a.length
  const n = b.length
  let prev = new Array(n + 1)
  let cur = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    cur[0] = i
    let rowMin = cur[0]
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (cur[j] < rowMin) rowMin = cur[j]
    }
    if (rowMin > max) return false
    const tmp = prev
    prev = cur
    cur = tmp
  }
  return prev[n] <= max
}

// 级联分层：顺序即优先级，任一层有命中就立刻返回，不再往下掉级。
// score 返回 >0 表示命中；同层内按 score → RANK 排序。
export const TIERS = [
  {
    name: 'equal',
    score: (r, q) => (r[TITLE] === q ? 100 : 0) + (r[EN] && r[EN] === q ? 80 : 0),
  },
  {
    name: 'prefix',
    score: (r, q) =>
      (r[TITLE].startsWith(q) ? 80 : 0) + (r[EN] && r[EN].startsWith(q) ? 60 : 0),
  },
  {
    // 拉丁字段（标题/英文名/标签/描述/分类）必须排在拼音层之前
    name: 'contains',
    score: (r, q) =>
      (r[TITLE].includes(q) ? 60 : 0) +
      (r[EN] && r[EN].includes(q) ? 50 : 0) +
      (r[TAGS].includes(q) ? 40 : 0) +
      (r[CAT].includes(q) ? 15 : 0) +
      (r[DESC].includes(q) ? 20 : 0),
  },
  {
    name: 'py-prefix',
    when: (q, ascii) => ascii,
    score: (r, q) =>
      (r[PY] && r[PY].startsWith(q) ? 70 : 0) + (r[PYI] && r[PYI].startsWith(q) ? 65 : 0),
  },
  {
    name: 'py-contains',
    when: (q, ascii) => ascii,
    score: (r, q) =>
      (r[PY] && r[PY].includes(q) ? 50 : 0) + (r[PYI] && r[PYI].includes(q) ? 45 : 0),
  },
  {
    name: 'subsequence',
    when: (q, ascii) => !ascii && q.length >= 3,
    score: (r, q) => (isSubsequence(r[TITLE], q) ? 30 : 0),
  },
  {
    // 最后一级兜底：容错只在这里出现，且前 6 层全空才会走到，
    // 所以「容错」与「噪声」不再是同一根旋钮（Fuse 的问题正是二者同频）。
    name: 'typo',
    when: (q) => q.length >= 3,
    score: (r, q) => (editWithin(r[TITLE], q, 1) ? 10 : 0),
  },
]

/**
 * 在索引记录数组上执行级联搜索。
 * @returns {{tier:number,name:string,total:number,hits:any[][]}} tier=-1 表示无命中
 */
export function searchIndex(items, rawQuery, opts = {}) {
  const limit = opts.limit ?? 0 // 0 = 不限
  const q = normalize(rawQuery)
  const empty = { tier: -1, name: 'none', total: 0, hits: [] }
  if (!q || !Array.isArray(items) || !items.length) return empty
  const ascii = isAsciiQuery(q)

  for (let ti = 0; ti < TIERS.length; ti++) {
    const tier = TIERS[ti]
    if (tier.when && !tier.when(q, ascii)) continue
    const matched = []
    for (const it of items) {
      const s = tier.score(it, q)
      if (s > 0) matched.push({ it, s })
    }
    if (!matched.length) continue
    matched.sort((a, b) => b.s - a.s || b.it[RANK] - a.it[RANK])
    const hits = limit > 0 ? matched.slice(0, limit).map((x) => x.it) : matched.map((x) => x.it)
    return { tier: ti, name: tier.name, total: matched.length, hits }
  }
  return empty
}

/**
 * 降落伞：索引不可用时的退路——全量资源上做归一化 includes。
 * 搜索挂了比搜索不模糊严重得多。
 */
export function searchFallback(resources, rawQuery, opts = {}) {
  const limit = opts.limit ?? 0
  const q = normalize(rawQuery)
  if (!q || !Array.isArray(resources)) return { tier: -1, name: 'fallback-empty', total: 0, hits: [] }
  const hits = resources.filter((r) => {
    const hay = normalize(
      `${r.title || ''} ${r.enTitle || ''} ${(r.tags || []).join('')} ${r.category || ''} ${r.desc || ''}`
    )
    return hay.includes(q)
  })
  return {
    tier: -1,
    name: 'fallback',
    total: hits.length,
    hits: limit > 0 ? hits.slice(0, limit) : hits,
  }
}
