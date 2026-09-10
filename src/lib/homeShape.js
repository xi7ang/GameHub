// src/lib/homeShape.js
// 从完整 resources 数组构建「首页精简数据」。
// 用途：① 构建脚本 scripts/gen-home.js 生成 public/data/home.json；
//       ② 前端 home.json 加载失败时兜底（用全量 resources 现场构建同结构）。
// 首页只渲染 20 张卡片 + 几个计数，不需要 568KB 全量字段（url/desc/pwd…）。

// 卡片渲染实际用到的字段（见 src/components/ResourceCard.vue）
const SLIM_FIELDS = ['id', 'title', 'cover', 'category', 'size', 'status', 'featured', 'addedAt']

export function slimCard(r) {
  const o = {}
  for (const k of SLIM_FIELDS) o[k] = r[k] == null ? '' : r[k]
  return o
}

export function buildHomeShape(resources) {
  const list = Array.isArray(resources) ? resources : []

  const categoryCounts = {}
  const monthCounts = {}
  for (const r of list) {
    if (r.category) categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1
    if (r.month) monthCounts[r.month] = (monthCounts[r.month] || 0) + 1
  }

  const sorted = [...list].sort((a, b) =>
    String(b.addedAt || '').localeCompare(String(a.addedAt || ''))
  )

  const latest = sorted.slice(0, 12).map(slimCard)
  const coverPool = list
    .filter((r) => r.cover && !/^data:/.test(r.cover))
    .map(slimCard)

  return {
    generatedAt: new Date().toISOString().slice(0, 10),
    total: list.length,
    categoryCounts,
    monthCounts,
    latest,
    coverPool,
  }
}
