// src/lib/homeShape.js
// 从完整 resources 数组构建「首页精简数据」。
// 用途：① 构建脚本 scripts/gen-home.js 生成 public/data/home.json；
//       ② 前端 home.json 加载失败时兜底（用全量 resources 现场构建同结构）。
// 首页只渲染 20 张卡片 + 几个计数，不需要 568KB 全量字段（url/desc/pwd…）。
//
// 2026-10 留存功能（收藏/追更）追加三个轻量聚合，首页仍只拉 home.json：
//   dailyCounts : { 'YYYY-MM-DD': n }  按天新增计数（前端取近 14 天画更新日历）
//   recentCards : 最近 60 条 slimCard   前端筛最近 7 天做「本周上新榜」（不在构建期定窗口，避免 CI=UTC 的日期漂移）
//   catRecent   : { catKey: [addedAt…] }近 90 天各分类新增时间戳（前端算「你追的分类有 N 条新货」）

// 卡片渲染实际用到的字段（见 src/components/ResourceCard.vue）
const SLIM_FIELDS = ['id', 'title', 'cover', 'category', 'size', 'status', 'featured', 'addedAt']

const RECENT_CARDS = 60 // 本周上新榜的取数池（按 addedAt 倒序的前 60 条）
const CAT_RECENT_DAYS = 90 // 追分类「新货」统计窗口（天）

export function slimCard(r) {
  const o = {}
  for (const k of SLIM_FIELDS) o[k] = r[k] == null ? '' : r[k]
  return o
}

// addedAt 形如 2026-10-02T11:56:51+08:00，前 10 位就是站点所在时区(+08:00)的本地日期
function dayKey(iso) {
  return String(iso || '').slice(0, 10)
}

export function buildHomeShape(resources) {
  const list = Array.isArray(resources) ? resources : []

  const categoryCounts = {}
  const monthCounts = {}
  const dailyCounts = {}
  for (const r of list) {
    if (r.category) categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1
    if (r.month) monthCounts[r.month] = (monthCounts[r.month] || 0) + 1
    const d = dayKey(r.addedAt)
    if (d) dailyCounts[d] = (dailyCounts[d] || 0) + 1
  }

  const sorted = [...list].sort((a, b) =>
    String(b.addedAt || '').localeCompare(String(a.addedAt || ''))
  )

  const latest = sorted.slice(0, 12).map(slimCard)
  const recentCards = sorted.slice(0, RECENT_CARDS).map(slimCard)

  // 追分类用：近 CAT_RECENT_DAYS 天各分类的 addedAt（倒序）
  const cut = new Date(Date.now() - (CAT_RECENT_DAYS - 1) * 86400000).toISOString().slice(0, 10)
  const catRecent = {}
  for (const r of sorted) {
    if (!r.category) continue
    const d = dayKey(r.addedAt)
    if (!d || d < cut) continue
    if (!catRecent[r.category]) catRecent[r.category] = []
    catRecent[r.category].push(r.addedAt)
  }

  const coverPool = list
    .filter((r) => r.cover && !/^data:/.test(r.cover))
    .map(slimCard)

  return {
    generatedAt: new Date().toISOString().slice(0, 10),
    total: list.length,
    categoryCounts,
    monthCounts,
    dailyCounts,
    latest,
    recentCards,
    catRecent,
    coverPool,
  }
}
