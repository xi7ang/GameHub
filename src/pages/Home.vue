<template>
  <div class="home">
    <SiteHeader />
    <BgWall />

    <!-- Hero -->
    <section class="hero">
      <div class="container hero__inner">
        <h1 class="hero__title">发现全网<br /><em>优质游戏资源</em></h1>
        <p class="hero__subtitle">{{ site?.slogan }} · 单机 / 手游 / Switch / MOD 一站式聚合</p>
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

    <!-- 游戏推荐：每次打开随机从有封面的资源中选 8 个 -->
    <section v-if="featured.length" class="container section">
      <h2 class="section-title">🎲 游戏推荐</h2>
      <div class="rc-grid">
        <ResourceCard v-for="r in featured" :key="r.id" :r="r" />
      </div>
    </section>

    <!-- 最新资源 -->
    <section class="container section">
      <h2 class="section-title">🆕 最新更新</h2>
      <div class="rc-grid">
        <ResourceCard v-for="r in latest" :key="r.id" :r="r" />
      </div>
    </section>

    <!-- 更新日历 + 本周上新榜（均取自 home.json 轻量聚合，首页不拉全量） -->
    <section class="container section">
      <div class="retain-grid">
        <div class="glass retain-card">
          <h2 class="section-title">📅 更新日历 <span class="retain-sub text-low">近 14 天</span></h2>
          <div class="cal">
            <div v-for="d in calendar" :key="d.date" class="cal__col" :title="`${d.date} · ${d.count} 条`">
              <span class="cal__count">{{ d.count || '' }}</span>
              <span class="cal__track"><span class="cal__bar" :style="{ height: barHeight(d.count) }"></span></span>
              <span class="cal__date text-low">{{ d.label }}</span>
            </div>
          </div>
        </div>

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
      <div class="cat-grid">
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
// 更新日历：近 14 天（含今天）每天新增数，天数取浏览器本地日期
const calendar = computed(() => {
  const dc = state.home?.dailyCounts || {}
  const out = []
  const now = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const key = dayKeyOf(d)
    out.push({ date: key, label: `${d.getMonth() + 1}/${d.getDate()}`, count: dc[key] || 0 })
  }
  return out
})
const calMax = computed(() => Math.max(1, ...calendar.value.map((d) => d.count)))
function barHeight(n) {
  if (!n) return '3px'
  return `${Math.max(4, Math.round((n / calMax.value) * 110))}px`
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
})
</script>

<style scoped>
.home { min-height: 100vh; }


/* Hero */
.hero { padding: 110px 0 50px; text-align: center; position: relative; z-index: 1; }
.hero__title {
  font-family: var(--font-display);
  font-size: clamp(40px, 6vw, 72px);
  font-weight: 700;
  line-height: 1.12;
  margin-bottom: 16px;
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
.hero__subtitle {
  font-size: 16px;
  color: var(--text-mid);
  margin-bottom: 30px;
  animation: fadeInUp 0.6s ease-out 0.16s both;
}
.hero__search {
  max-width: 640px;
  margin: 0 auto;
  position: relative;
  z-index: 5; /* 让搜索下拉浮层盖过 .hero__hot（动画 transform 也会创建层叠上下文） */
  animation: fadeInUp 0.6s ease-out 0.24s both;
}
.hero__hot {
  margin-top: 22px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  animation: fadeInUp 0.6s ease-out 0.32s both;
}
.hero__hot .hot-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  margin-right: 2px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-gold);
  border: 1px dashed rgba(var(--accent-rgb), 0.55);
  background: rgba(var(--accent-rgb), 0.08);
  white-space: nowrap;
}
.hot-tag {
  padding: 7px 18px;
  border-radius: 100px;
  font-size: 13.5px;
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

/* ── 留存模块：更新日历 / 本周上新榜 / 我的追更 ── */
.retain-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: 18px;
  position: relative;
  z-index: 1;
}
/* 网格子项默认 min-width:auto：会被内容的 min-content 顶开 → 窄屏整页横向溢出。
   横向溢出又会让 position:fixed 的公告弹窗在多端上偏位（参照系被撑大）。显式归零。 */
.retain-grid > * { min-width: 0; }
.retain-card { padding: 22px 22px 18px; }
.retain-card:hover { transform: none; }
.retain-sub {
  font-family: var(--font-body, inherit);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
}
.retain-empty { font-size: 14px; padding: 12px 0; }

/* 更新日历 */
.cal { display: flex; align-items: flex-end; gap: 4px; padding-top: 6px; min-width: 0; }
.cal__col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.cal__count { font-size: 10.5px; font-weight: 700; color: var(--text-mid); height: 14px; }
.cal__track { height: 110px; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
.cal__bar {
  width: 62%;
  max-width: 26px;
  border-radius: 4px 4px 2px 2px;
  background: linear-gradient(180deg, var(--accent-gold), var(--accent-gold-deep));
  box-shadow: 0 0 10px rgba(var(--accent-rgb), 0.35);
  transition: height 0.3s ease;
}
.cal__col:hover .cal__bar { box-shadow: 0 0 16px rgba(var(--accent-rgb), 0.6); }
.cal__date { font-size: 10px; white-space: nowrap; }

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
  /* 这里必须是 minmax(0,1fr)：裸 1fr 的自动最小值 = 内容 min-content，会被日历的
     14 个不换行日期顶开，把整个文档撑宽到 564px（实测）。这正是弹窗偏位 + 整站变宽的根因。 */
  .retain-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 560px) {
  .cal__date { font-size: 9px; }
  .cal { gap: 2px; }
  .retain-card { padding: 18px 14px 14px; }
}
</style>
