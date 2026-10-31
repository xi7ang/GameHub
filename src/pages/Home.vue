<template>
  <div class="home">
    <SiteHeader />
    <BgWall />

    <!-- Hero -->
    <section class="hero">
      <div class="container hero__inner">
        <h1 class="hero__title">发现全网<br /><em>优质游戏资源</em></h1>
        <div class="hero__search">
          <SearchBox :lucky-resources="luckyCoverPool" />
        </div>
        <div class="hero__hot">
          <span class="hot-label">🔥 热门搜索</span>
          <a
            v-for="k in hotKeywords"
            :key="k"
            :href="`/search.html?q=${encodeURIComponent(k)}`"
            class="hot-tag"
          >{{ k }}</a>
        </div>
      </div>
    </section>

    <!-- 必玩合集：搜索区下方入口带，数据来自 collections.json（构建期按口碑线生成） -->
    <section v-if="collections.length" class="container section collections-strip">
      <h2 class="section-title">🏆 必玩合集</h2>
      <div class="col-row" :class="{ 'col-row--more': showAllCols }">
        <a
          v-for="c in collections"
          :key="c.id"
          class="col-card"
          :href="`/collection.html?id=${c.id}`"
        >
          <div class="col-card__covers">
            <img
              v-for="(it, i) in collageOf(c)"
              :key="i"
              :src="it.cover"
              alt=""
              loading="lazy"
            />
          </div>
          <div class="col-card__meta">
            <span class="col-card__name">{{ c.emoji }} {{ c.name }}</span>
            <span class="col-card__count">{{ c.items.length }} 款</span>
          </div>
          <div class="col-card__top text-low">No.1 《{{ cleanTitle(c.items[0]) }}》</div>
        </a>
      </div>
      <button type="button" class="col-more" @click="showAllCols = !showAllCols">
        {{ showAllCols ? '收起' : '获取更多' }}
      </button>
    </section>

    <!-- 游戏推荐：每次打开随机从有封面的资源中选 8 个 -->
    <section v-if="featured.length" class="container section">
      <h2 class="section-title">🎲 游戏推荐</h2>
      <div class="rc-grid" :class="{ 'rc-grid--more': showAllFeatured }">
        <ResourceCard v-for="r in featured" :key="r.id" :r="r" />
      </div>
      <button type="button" class="col-more" @click="showAllFeatured = !showAllFeatured">
        {{ showAllFeatured ? '收起' : '获取更多' }}
      </button>
    </section>

    <!-- 最新资源 -->
    <section class="container section">
      <h2 class="section-title">🆕 最新更新</h2>
      <div class="rc-grid" :class="{ 'rc-grid--more': showAllLatest }">
        <ResourceCard v-for="r in latest" :key="r.id" :r="r" />
      </div>
      <button type="button" class="col-more" @click="showAllLatest = !showAllLatest">
        {{ showAllLatest ? '收起' : '获取更多' }}
      </button>
    </section>

    <!-- 本周上新榜（取自 home.json 轻量聚合，首页不拉全量） -->
    <section class="container section">
      <div class="retain-grid">
        <div class="glass retain-card">
          <h2 class="section-title">🔥 本周上新榜</h2>
          <div v-if="weeklyTop.length" class="rank">
            <a v-for="(r, i) in weeklyTop" :key="r.id" :href="detailHref(r.id)" class="rank__row">
              <span class="rank__no" :class="`rank__no--${i + 1}`">{{ i + 1 }}</span>
              <span class="rank__thumb"><img v-if="r.cover" :src="r.cover" alt="" loading="lazy" /></span>
              <span class="rank__body">
                <span class="rank__title">{{ r.title }}</span>
                <span class="rank__meta text-low">{{ catLabel(r.category) }} · {{ fmtMD(r.addedAt) }}</span>
              </span>
            </a>
          </div>
          <p v-else class="retain-empty text-low">本周还没有新货，先看看上方的最新更新吧。</p>
        </div>
      </div>
    </section>

    <!-- 我的追更：本地无收藏/追分类时整块隐藏 -->
    <section v-if="showFollow" class="container section">
      <h2 class="section-title">⭐ 我的追更</h2>
      <div class="glass follow-panel">
        <div v-if="followItems.length" class="follow-chips">
          <a
            v-for="f in followItems"
            :key="f.key"
            :href="`/category.html?cat=${f.key}`"
            class="follow-chip"
            @click="markFollowSeen(f.key)"
          >
            <span class="follow-chip__emoji">{{ f.emoji }}</span>
            <span>你追的「{{ f.name }}」{{ f.count ? `有 ${f.count} 条新货` : '暂无新货' }}</span>
          </a>
        </div>
        <p v-else class="text-low">还没追更任何分类——去分类页点「☆ 追更这个分类」，有新货首页会提醒你。</p>
        <a href="/favorites.html" class="follow-panel__mine">查看我的收藏（{{ favCount() }}）→</a>
      </div>
    </section>

    <!-- 分类宫格 -->
    <section class="container section">
      <h2 class="section-title">🗂️ 资源分类</h2>
      <div class="cat-grid" :class="{ 'cat-grid--more': showAllCats }">
        <a
          v-for="(c, i) in state.categories"
          :key="c.key"
          :href="`/category.html?cat=${c.key}`"
          class="cat-card glass fade-up"
          :class="`fade-up-${(i % 3) + 1}`"
        >
          <div class="cat-card__icon" :style="iconStyle(c)">{{ c.emoji }}</div>
          <div class="cat-card__name">{{ c.name }}</div>
          <div class="cat-card__count text-low">{{ countBy(c.key) }} 个资源</div>
        </a>
      </div>
      <button type="button" class="col-more" @click="showAllCats = !showAllCats">
        {{ showAllCats ? '收起' : '获取更多' }}
      </button>
    </section>

    <!-- 最新动态（已隐藏）
         注意：P0 后首页走 useData.loadHome()，不再加载 commits.json（state.commits 恒为 []）。
         若要恢复本板块，需在 loadHome() 里补 fetch `${BASE}data/commits.json`。
    <section v-if="state.commits.length" class="container section">
      <h2 class="section-title">📡 最新动态</h2>
      <div class="commit-list glass">
        <a
          v-for="c in state.commits.slice(0, 10)"
          :key="c.hash"
          :href="c.url"
          target="_blank"
          rel="noreferrer"
          class="commit-item"
        >
          <span class="commit-item__msg">{{ c.message }}</span>
          <span class="commit-item__date text-low">{{ fmtDate(c.date) }}</span>
          <span class="commit-item__hash badge">{{ c.hash }}</span>
        </a>
      </div>
    </section>
    -->

    <!-- 数据统计条（页脚上方） -->
    <section class="container stats fade-up">
      <div class="stat">
        <div class="stat__num">{{ state.home?.total || 0 }}</div>
        <div class="stat__label text-low">资源总数</div>
      </div>
      <div class="stat">
        <div class="stat__num">{{ state.categories.length }}</div>
        <div class="stat__label text-low">游戏分类</div>
      </div>
      <div class="stat">
        <div class="stat__num">{{ lastMonthCount }}</div>
        <div class="stat__label text-low">本月新增</div>
      </div>
      <div class="stat">
        <div class="stat__num">100%</div>
        <div class="stat__label text-low">免费分享</div>
      </div>
    </section>

    <SiteFooter />

  </div>

  <AnnouncementModal />
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'
import BgWall from '../components/BgWall.vue'
import SearchBox from '../components/SearchBox.vue'
import ResourceCard from '../components/ResourceCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import AnnouncementModal from '../components/AnnouncementModal.vue'
import { useData } from '../composables/useData.js'
import { useFavorites } from '../composables/useFavorites.js'
import { detailHref } from '../lib/short.js'
import { BUILD_ID } from '../lib/version.js'

const { state, loadHome, catLabel } = useData()

// 必玩合集入口带：数据来自 collections.json（构建期生成），拉不到就整块隐藏
const collections = ref([])
const showAllCols = ref(false) // 移动端双列默认只展示 4 个合集，「获取更多」展开全部
const showAllFeatured = ref(false) // 游戏推荐：移动端默认 4 个
const showAllLatest = ref(false) // 最新更新：移动端默认 4 个
const showAllCats = ref(false) // 资源分类：移动端默认 4 个
async function loadCollections() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/collections.json?v=${BUILD_ID || Date.now()}`)
    if (!res.ok) return
    const j = await res.json()
    collections.value = (j.collections || []).filter((c) => c.items?.length)
  } catch { /* 静默隐藏 */ }
}
// 合集卡拼图：优先用有封面的入选游戏（个别资源无封面，避免拼图里出现破图）
function collageOf(c) {
  return (c?.items || []).filter((it) => it.cover).slice(0, 4)
}
// 合集卡 No.1 行的标题清洗（与 ResourceCard 展示标题同规则的核心部分）
function cleanTitle(r) {
  return String(r?.title || '')
    .replace(/build\.?\s*\d+/gi, ' ')
    .replace(/ver\.?\s*[\d.]+/gi, ' ')
    .replace(/v\d+(\.\d+)+[a-z]?/gi, ' ')
    .replace(/\s*v\d+[a-z]?\s*$/i, '')
    .replace(/(中文版|解压即玩|免安装版|免安装|硬盘版)\s*$/g, '')
    .replace(/\s*附[^/]*$/, '')
    .replace(/\s*XG器.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}
const { favCount, followedCats, newCountFor, markFollowSeen } = useFavorites()
const site = computed(() => state.site)

// 热门搜索关键词：每次打开从 hotKeywords.json 的 100+ 词中随机选 6-7 个
const hotKeywords = ref([])
async function pickRandomHotKeywords() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/hotKeywords.json?v=${BUILD_ID || Date.now()}`)
    if (!res.ok) return
    const data = await res.json()
    const pool = Array.isArray(data.keywords) ? data.keywords : []
    // 随机洗牌
    const arr = [...pool]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    // 每次 6-7 个
    const n = 6 + Math.floor(Math.random() * 2)
    hotKeywords.value = arr.slice(0, n)
  } catch { /* 加载失败不展示 */ }
}

// 游戏推荐：每次打开页面从「有封面的资源池」中随机选 8 个（池来自 home.json）
const featured = ref([])
// 「手气不错」的随机池：同一份有封面的资源（home.json 的 coverPool，437 条）
const luckyCoverPool = computed(() => state.home?.coverPool || [])
function pickRandomFeatured() {
  const pool = state.home?.coverPool || []
  const arr = [...pool]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  featured.value = arr.slice(0, 8)
}
const latest = computed(() => state.home?.latest || [])

// ── 留存模块（数据全部来自 home.json 的轻量聚合，不触发全量加载）──
function dayKeyOf(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
// 本周上新榜：最近 7 天 addedAt 倒序 top 10（池 = home.recentCards 前 60 条）
const weeklyTop = computed(() => {
  const cards = state.home?.recentCards || []
  const keys = new Set()
  const now = new Date()
  for (let i = 0; i < 7; i++) {
    keys.add(dayKeyOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)))
  }
  return cards.filter((c) => keys.has(String(c.addedAt || '').slice(0, 10))).slice(0, 10)
})
// 追更：把 home.catRecent 摊平成 [{category, addedAt}] 供 newCountFor 计数
const followPool = computed(() => {
  const cr = state.home?.catRecent || {}
  const out = []
  for (const k of Object.keys(cr)) for (const t of cr[k]) out.push({ category: k, addedAt: t })
  return out
})
const followItems = computed(() =>
  followedCats().map((k) => {
    const c = state.categories.find((x) => x.key === k) || { key: k, name: k, emoji: '📦' }
    return { key: k, name: c.name, emoji: c.emoji, count: newCountFor(k, followPool.value) }
  })
)
const showFollow = computed(() => followItems.value.length > 0 || favCount() > 0)
function fmtMD(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const lastMonthCount = computed(() => {
  const now = new Date()
  const m = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  return state.home?.monthCounts?.[m] || 0
})

function countBy(key) {
  return state.home?.categoryCounts?.[key] || 0
}
function iconStyle(c) {
  return {
    background: `linear-gradient(135deg, ${c.gradient[0]}33, ${c.gradient[1]}22)`,
    border: `1px solid ${c.gradient[0]}55`,
    boxShadow: `0 0 20px ${c.gradient[0]}22`,
  }
}
function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(async () => {
  await loadHome()
  pickRandomFeatured()
  pickRandomHotKeywords()
  loadCollections()
})
</script>

<style scoped>
.home { min-height: 100vh; }

/* 必玩合集入口带：PC 端两行三列网格（6 个合集正好排满，不再横向滚动） */
.collections-strip { padding-top: 8px; }
.col-row {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 14px;
}
.col-card {
  text-decoration: none; color: inherit;
  border: 1px solid var(--border, rgba(127, 127, 127, 0.25)); border-radius: 16px;
  overflow: hidden; background: var(--surface, rgba(127, 127, 127, 0.06));
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.col-card:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18); }
.col-card__covers { display: grid; grid-template-columns: 1fr 1fr; aspect-ratio: 2.4; }
.col-card__covers img { width: 100%; height: 100%; object-fit: cover; display: block; }
.col-card__meta {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px 2px; font-weight: 700; font-size: 15px;
}
.col-card__count { font-size: 12px; font-weight: 600; opacity: 0.65; }
.col-card__top { padding: 0 12px 12px; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.col-more { display: none; }
@media (max-width: 640px) {
  /* 移动端改双列网格：每行两个合集卡，默认只展示前 4 个，点「获取更多」展开全部 */
  .col-row {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
    overflow: visible; scroll-snap-type: none; padding-bottom: 0;
  }
  .col-row:not(.col-row--more) .col-card:nth-child(n + 5) { display: none; }
  .col-card { border-radius: 13px; }
  .col-card__meta { padding: 8px 10px 2px; font-size: 13.5px; }
  .col-card__count { font-size: 11px; }
  .col-card__top { padding: 0 10px 10px; font-size: 11px; }
  .col-more {
    display: block; margin: 12px auto 0; padding: 8px 28px;
    border-radius: 999px; border: 1px solid var(--border, rgba(127, 127, 127, 0.35));
    background: var(--surface, rgba(127, 127, 127, 0.06)); color: inherit;
    font-size: 13.5px; cursor: pointer;
  }
  /* 游戏推荐 / 最新更新 / 资源分类：移动端默认只展示前 4 个，与「必玩合集」一致 */
  .rc-grid:not(.rc-grid--more) > *:nth-child(n + 5),
  .cat-grid:not(.cat-grid--more) > *:nth-child(n + 5) { display: none; }
}


/* Hero */
.hero { padding: 44px 0 28px; text-align: center; position: relative; z-index: 1; }
.hero__title {
  font-family: var(--font-display);
  font-size: clamp(32px, 5vw, 56px);
  font-weight: 700;
  line-height: 1.12;
  margin-bottom: 12px;
  animation: fadeInUp 0.6s ease-out 0.08s both;
}
.hero__title em {
  font-style: normal;
  background: linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-terracotta) 60%, var(--accent-gold-deep) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 24px rgba(var(--accent-rgb), 0.4));
}
.hero__search {
  max-width: 640px;
  margin: 0 auto;
  position: relative;
  z-index: 5; /* 让搜索下拉浮层盖过 .hero__hot（动画 transform 也会创建层叠上下文） */
  animation: fadeInUp 0.6s ease-out 0.24s both;
}
/* 首页 hero 里的搜索框纵向收紧（搜索结果页的 SearchBox 不动） */
.hero__search :deep(.search-bar) { padding: 8px 16px; border-radius: 12px; }
.hero__search :deep(.search-bar__input) { font-size: 15px; }
.hero__search :deep(.search-bar__lucky) { padding: 5px 10px; font-size: 12px; gap: 5px; }
/* 手气不错按钮内部同步缩小：骰子 20px → 16px，面距同步 10px → 8px（!important 覆盖内联 transform），点数同步缩小 */
.hero__search :deep(.search-bar__lucky-die) { width: 16px; height: 16px; perspective: 80px; }
.hero__search :deep(.search-bar__lucky-die__face) { border-radius: 3px; }
.hero__search :deep(.search-bar__lucky-die__face:nth-child(1)) { transform: translateZ(8px) !important; }
.hero__search :deep(.search-bar__lucky-die__face:nth-child(2)) { transform: rotateY(90deg) translateZ(8px) !important; }
.hero__search :deep(.search-bar__lucky-die__face:nth-child(3)) { transform: rotateX(90deg) translateZ(8px) !important; }
.hero__search :deep(.search-bar__lucky-die__face:nth-child(4)) { transform: rotateX(-90deg) translateZ(8px) !important; }
.hero__search :deep(.search-bar__lucky-die__face:nth-child(5)) { transform: rotateY(-90deg) translateZ(8px) !important; }
.hero__search :deep(.search-bar__lucky-die__face:nth-child(6)) { transform: rotateY(180deg) translateZ(8px) !important; }
.hero__search :deep(.search-bar__lucky-die__face i) { width: 2px; height: 2px; }
.hero__hot {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  animation: fadeInUp 0.6s ease-out 0.32s both;
}
.hero__hot .hot-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  margin-right: 2px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 700;
  color: var(--accent-gold);
  border: 1px dashed rgba(var(--accent-rgb), 0.55);
  background: rgba(var(--accent-rgb), 0.08);
  white-space: nowrap;
}
.hot-tag {
  padding: 5px 14px;
  border-radius: 100px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-hi);
  border: 1px solid rgba(var(--accent-rgb), 0.5);
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.22), rgba(var(--accent2-rgb), 0.1));
  box-shadow: inset 0 0 12px rgba(var(--accent-rgb), 0.06);
  letter-spacing: 0.02em;
  transition: all 0.2s;
}
.hot-tag:hover {
  color: #fff;
  border-color: var(--accent-gold);
  background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-deep));
  box-shadow: 0 0 18px rgba(var(--accent-rgb), 0.55), var(--shadow-glow);
  transform: translateY(-2px);
}
/* 移动端 hero 再收紧：首屏多露出一行合集卡 */
@media (max-width: 640px) {
  .hero { padding: 28px 0 20px; }
  /* 热门关键词至多展示两行（标签 32px + 间距 8px = 两行 72px），多余的裁掉 */
  .hero__hot { max-height: 72px; overflow: hidden; }
}

/* Stats（页脚上方，无边框） */
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  padding: 36px 0 8px;
  position: relative;
  z-index: 1;
  border-top: 1px solid rgba(var(--accent-rgb), 0.15);
  margin-top: 8px;
}
.stat { text-align: center; }
.stat__num {
  font-family: var(--font-display);
  font-size: clamp(30px, 4vw, 40px);
  font-weight: 700;
  line-height: 1.1;
  background: linear-gradient(135deg, var(--accent-gold), var(--accent-terracotta));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.stat__label { font-size: 13px; margin-top: 6px; letter-spacing: 0.08em; }

/* Categories */
.cat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.cat-card { padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
.cat-card__icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
}
.cat-card__name { font-size: 16px; font-weight: 700; }
.cat-card__count { font-size: 12px; }

/* Resource grid */
.rc-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

/* Commits */
.commit-list { padding: 8px 18px; }
.commit-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 0;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.08);
  transition: padding 0.2s;
}
.commit-item:last-child { border-bottom: none; }
.commit-item:hover { padding-left: 6px; }
.commit-item__msg { flex: 1; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.commit-item__date { font-size: 12px; flex-shrink: 0; }

@media (max-width: 1024px) {
  .cat-grid, .rc-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 768px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
  .cat-grid, .rc-grid { grid-template-columns: repeat(2, 1fr); }
  /* 卡片区两侧再留 8px（容器 16 → 实际 24px），手机上一屏不显拥挤 */
  .cat-grid, .rc-grid { padding: 0 8px; }
}
@media (max-width: 480px) {
  .rc-grid { grid-template-columns: repeat(2, 1fr); }
  .cat-grid { grid-template-columns: repeat(2, 1fr); }
}

/* ── 留存模块：本周上新榜 / 我的追更 ── */
.retain-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
  position: relative;
  z-index: 1;
}
/* 网格子项默认 min-width:auto：会被内容的 min-content 顶开 → 窄屏整页横向溢出。
   横向溢出又会让 position:fixed 的公告弹窗在多端上偏位（参照系被撑大）。显式归零。 */
.retain-grid > * { min-width: 0; }
.retain-card { padding: 22px 22px 18px; }
.retain-card:hover { transform: none; }
.retain-empty { font-size: 14px; padding: 12px 0; }

/* 本周上新榜 */
.rank { display: flex; flex-direction: column; min-width: 0; }
.rank__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.08);
  transition: padding 0.2s;
}
.rank__row:last-child { border-bottom: none; }
.rank__row:hover { padding-left: 9px; }
.rank__no {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-low);
  background: rgba(var(--accent-rgb), 0.08);
}
.rank__no--1 { color: #3b1e00; background: linear-gradient(135deg, #ffd45c, #ff9f22); }
.rank__no--2 { color: var(--text-hi); background: rgba(255, 255, 255, 0.16); }
.rank__no--3 { color: #3b1e00; background: linear-gradient(135deg, #e8c48a, #c99a5b); }
.rank__thumb {
  flex: none;
  width: 44px;
  height: 30px;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(var(--accent-rgb), 0.1);
}
.rank__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.rank__body { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.rank__title {
  font-size: 13.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rank__meta { font-size: 11.5px; }

/* 我的追更 */
.follow-panel { padding: 18px 20px; position: relative; z-index: 1; }
.follow-panel:hover { transform: none; }
.follow-chips { display: flex; flex-wrap: wrap; gap: 10px; }
.follow-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 100px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-hi);
  border: 1px solid rgba(var(--accent-rgb), 0.45);
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.2), rgba(var(--accent2-rgb), 0.08));
  transition: all 0.2s;
}
.follow-chip:hover {
  color: #fff;
  border-color: var(--accent-gold);
  background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-deep));
  box-shadow: 0 0 18px rgba(var(--accent-rgb), 0.5);
  transform: translateY(-2px);
}
.follow-chip__emoji { font-size: 16px; }
.follow-panel__mine {
  display: inline-block;
  margin-top: 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-gold);
}
.follow-panel__mine:hover { color: var(--accent-terracotta); }

@media (max-width: 900px) {
  /* 必须 minmax(0,1fr)：裸 1fr 的自动最小值 = 内容 min-content，会被不换行的长内容顶开，
     把整个文档撑宽（实测 564px），进而让 position:fixed 的弹窗偏位。 */
  .retain-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 560px) {
  .retain-card { padding: 18px 14px 14px; }
}
</style>
