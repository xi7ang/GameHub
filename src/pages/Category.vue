<template>
  <div class="category-page">
    <SiteHeader />
    <BgWall />

    <!-- 分类头 -->
    <section class="cat-hero">
      <div class="container cat-hero__inner">
        <div class="cat-hero__icon" :style="iconStyle">{{ cat?.emoji }}</div>
        <h1 class="cat-hero__title">{{ cat?.name || '资源库' }}</h1>
        <p class="cat-hero__sub text-low">{{ filtered.length }} 个资源</p>
        <button
          v-if="curCat"
          type="button"
          class="cat-follow"
          :class="{ 'cat-follow--on': following }"
          :aria-pressed="following"
          @click="onFollow"
        >{{ following ? '★ 已追更' : '☆ 追更这个分类' }}</button>
      </div>
    </section>

    <section class="container">
      <!-- 分类切换 -->
      <div class="cat-tabs wrap">
        <a
          :href="`/category.html${curCat ? '?cat=' + curCat : ''}`"
          class="cat-tab"
          :class="{ active: !curCat }"
        >全部</a>
        <a
          v-for="c in state.categories"
          :key="c.key"
          :href="`/category.html?cat=${c.key}`"
          class="cat-tab"
          :class="{ active: curCat === c.key }"
        >{{ c.emoji }} {{ c.name }}</a>
      </div>

      <!-- 月份归档 -->
      <div v-if="months.length > 1" class="month-tabs wrap">
        <a
          v-for="m in months"
          :key="m"
          :href="`/category.html?cat=${curCat || ''}&month=${m}`"
          class="month-tab"
          :class="{ active: curMonth === m }"
        >{{ fmtMonth(m) }}</a>
        <a
          v-if="curMonth"
          :href="`/category.html?cat=${curCat || ''}`"
          class="month-tab"
        >全部月份</a>
      </div>

      <!-- 多维筛选：题材/主题/评价/年份/特色，行内多选取或、行间取交 -->
      <div class="dim-panel glass">
        <div class="dim-head">
          <span class="dim-head__title">🎛️ 多维筛选</span>
          <span v-if="activeCount" class="dim-head__count">已选 {{ activeCount }} 个条件</span>
          <span class="dim-head__spacer"></span>
          <button v-if="activeCount" type="button" class="dim-clear" @click="clearDims">清空筛选</button>
          <button type="button" class="dim-toggle" @click="panelOpen = !panelOpen">
            {{ panelOpen ? '收起 ▲' : '展开 ▼' }}
          </button>
        </div>
        <div class="dim-body" :class="{ open: panelOpen }">
          <div class="dim-row">
            <span class="dim-row__label">题材</span>
            <div class="dim-chips">
              <button
                v-for="g in GENRES"
                :key="g"
                type="button"
                class="dim-chip"
                :class="{ on: selGenres.includes(g) }"
                @click="toggleIn(selGenres, g)"
              >{{ g }}</button>
            </div>
          </div>
          <div class="dim-row">
            <span class="dim-row__label">主题</span>
            <div class="dim-chips">
              <button
                v-for="t in THEMES"
                :key="t.name"
                type="button"
                class="dim-chip"
                :class="{ on: selThemes.includes(t.name) }"
                @click="toggleIn(selThemes, t.name)"
              >{{ t.name }}</button>
            </div>
          </div>
          <div class="dim-row">
            <span class="dim-row__label">评价</span>
            <div class="dim-chips">
              <button
                v-for="t in tierOptions"
                :key="t"
                type="button"
                class="dim-chip"
                :class="{ on: selTier === t }"
                @click="selTier = selTier === t ? '' : t"
              >{{ t }}</button>
            </div>
          </div>
          <div class="dim-row">
            <span class="dim-row__label">年份</span>
            <div class="dim-chips">
              <button
                v-for="y in yearOptions"
                :key="y"
                type="button"
                class="dim-chip"
                :class="{ on: selYear === y }"
                @click="selYear = selYear === y ? '' : y"
              >{{ y }}</button>
            </div>
          </div>
          <div class="dim-row">
            <span class="dim-row__label">特色</span>
            <div class="dim-chips">
              <button
                v-for="f in FEATURES"
                :key="f.key"
                type="button"
                class="dim-chip"
                :class="{ on: selFeatures.includes(f.key) }"
                @click="toggleIn(selFeatures, f.key)"
              >{{ f.name }}</button>
            </div>
          </div>
          <p class="dim-hint text-low">题材、主题、年份、评价仅对有 Steam 资料的游戏生效；多个条件同时选时取交集。</p>
        </div>
      </div>

      <!-- 筛选排序 -->
      <div class="filters flex-between wrap">
        <div class="flex gap-sm wrap">
          <select v-model="platformFilter" class="form-input filter-select">
            <option value="">全部网盘</option>
            <option v-for="(p, k) in site?.platforms" :key="k" :value="k">{{ p.label }}</option>
          </select>
          <select v-model="sortBy" class="form-input filter-select">
            <option value="newest">最新优先</option>
            <option value="oldest">最早优先</option>
            <option value="size">按大小</option>
            <option value="rate">好评率最高</option>
            <option value="reviews">评测最多</option>
          </select>
        </div>
        <span class="text-low">{{ filtered.length }} / {{ allResources.length }} 个资源</span>
      </div>

      <!-- 资源网格 -->
      <div v-if="state.loading" class="rc-grid">
        <div v-for="i in 8" :key="i" class="skeleton" style="height: 260px"></div>
      </div>
      <div v-else-if="filtered.length" class="rc-grid">
        <ResourceCard v-for="r in filtered" :key="r.id" :r="r" />
      </div>
      <div v-else class="empty glass">
        <div style="font-size: 40px; margin-bottom: 10px">🕹️</div>
        <template v-if="activeCount">
          <p>没有符合这些筛选条件的资源，换个组合试试</p>
          <button type="button" class="btn btn-primary mt-md" @click="clearDims">清空筛选</button>
        </template>
        <template v-else>
          <p>该分类下暂无资源，去看看其他分类吧</p>
          <a href="/" class="btn btn-primary mt-md">返回首页</a>
        </template>
      </div>
    </section>

    <SiteFooter />
  </div>
  <AnnouncementModal />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'
import BgWall from '../components/BgWall.vue'
import ResourceCard from '../components/ResourceCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import AnnouncementModal from '../components/AnnouncementModal.vue'
import { useData } from '../composables/useData.js'
import { useFavorites } from '../composables/useFavorites.js'

const { state, load, catMeta } = useData()

const site = computed(() => state.site)

const params = new URLSearchParams(location.search)
const curCat = params.get('cat')
const curMonth = params.get('month')

const { isFollowing, toggleFollowCat, markFollowSeen } = useFavorites()
const following = computed(() => (curCat ? isFollowing(curCat) : false))
function onFollow() {
  if (curCat) toggleFollowCat(curCat)
}

const platformFilter = ref('')
const sortBy = ref('newest')

/* ---------- 多维筛选 ---------- */
const panelOpen = ref(false)
const GENRES = ['动作', '冒险', '角色扮演', '策略', '模拟', '休闲', '独立']
// 主题：Steam 没有现成字段，用标题+官方简介关键词识别（与必玩合集同口径）
const THEMES = [
  { name: '开放世界', re: /开放世界/ },
  { name: '肉鸽', re: /肉鸽|roguelike|rougelite/i },
  { name: '生存', re: /生存/ },
  { name: '恐怖', re: /恐怖/ },
  { name: '解谜', re: /解谜/ },
  { name: '沙盒', re: /沙盒|sandbox/i },
  { name: '像素', re: /像素/ },
]
const FEATURES = [
  { key: 'zh', name: '支持中文' },
  { key: 'online', name: '可联机' },
  { key: 'free', name: '免费游戏' },
]
const selGenres = ref([])
const selThemes = ref([])
const selTier = ref('')
const selYear = ref('')
const selFeatures = ref([])
function toggleIn(arr, v) {
  const i = arr.indexOf(v)
  if (i >= 0) arr.splice(i, 1)
  else arr.push(v)
}
const activeCount = computed(
  () =>
    selGenres.value.length +
    selThemes.value.length +
    selFeatures.value.length +
    (selTier.value ? 1 : 0) +
    (selYear.value ? 1 : 0)
)
function clearDims() {
  selGenres.value = []
  selThemes.value = []
  selFeatures.value = []
  selTier.value = ''
  selYear.value = ''
}

const TIER_MAP = {
  'Overwhelmingly Positive': '好评如潮',
  'Very Positive': '特别好评',
  Positive: '好评',
  'Mostly Positive': '多半好评',
  Mixed: '褒贬不一',
  'Mostly Negative': '多半差评',
  Negative: '差评',
  'Very Negative': '差评',
  'Overwhelmingly Negative': '差评如潮',
}
const TIER_ORDER = ['好评如潮', '特别好评', '好评', '多半好评', '褒贬不一', '多半差评', '差评', '差评如潮']
const tierOf = (r) => TIER_MAP[r.steam?.rating?.scoreDesc] || ''
const yearOf = (r) => (String(r.steam?.releaseDate || '').match(/\d{4}/) || [''])[0]

const tierOptions = computed(() => {
  const present = new Set(allResources.value.map(tierOf).filter(Boolean))
  return TIER_ORDER.filter((t) => present.has(t))
})
const yearOptions = computed(() => {
  const present = new Set(allResources.value.map(yearOf).filter(Boolean))
  return [...present].sort((a, b) => b.localeCompare(a))
})

function themeText(r) {
  return `${r.title || ''} ${r.steam?.summary || ''} ${(r.steam?.genres || []).join(' ')}`
}
function featureOk(r, key) {
  if (key === 'zh')
    return (
      String(r.steam?.languages || '').includes('简体中文') ||
      (r.tags || []).some((t) => t === '中文' || t === '汉化')
    )
  if (key === 'online')
    return (
      r.category === 'online' ||
      (r.tags || []).includes('联机') ||
      (r.steam?.genres || []).includes('大型多人在线')
    )
  if (key === 'free') return r.steam?.price?.free === true
  return true
}
function dimOk(r) {
  if (selGenres.value.length) {
    const gs = r.steam?.genres || []
    if (!selGenres.value.some((g) => gs.includes(g))) return false
  }
  if (selThemes.value.length) {
    const s = themeText(r)
    if (!selThemes.value.some((n) => THEMES.find((t) => t.name === n)?.re.test(s))) return false
  }
  if (selTier.value && tierOf(r) !== selTier.value) return false
  if (selYear.value && yearOf(r) !== selYear.value) return false
  for (const f of selFeatures.value) if (!featureOk(r, f)) return false
  return true
}

const cat = computed(() => (curCat ? catMeta(curCat) : null))
const iconStyle = computed(() => {
  if (!cat.value) return {}
  const [a, b] = cat.value.gradient
  return {
    background: `linear-gradient(135deg, ${a}33, ${b}22)`,
    border: `1px solid ${a}55`,
    boxShadow: `0 0 30px ${a}33`,
  }
})

const allResources = computed(() => {
  let list = state.resources
  if (curCat) list = list.filter((r) => r.category === curCat)
  if (curMonth) list = list.filter((r) => r.month === curMonth)
  return list
})

const months = computed(() => {
  const set = new Set(allResources.value.map((r) => r.month).filter(Boolean))
  return [...set].sort((a, b) => b.localeCompare(a))
})

const filtered = computed(() => {
  let list = allResources.value
  if (platformFilter.value) list = list.filter((r) => r.platform === platformFilter.value)
  if (activeCount.value) list = list.filter(dimOk)
  if (sortBy.value === 'newest') list = [...list].sort((a, b) => b.addedAt.localeCompare(a.addedAt))
  if (sortBy.value === 'oldest') list = [...list].sort((a, b) => a.addedAt.localeCompare(b.addedAt))
  if (sortBy.value === 'size') list = [...list].sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0))
  if (sortBy.value === 'rate')
    list = [...list].sort(
      (a, b) => (b.steam?.rating?.positiveRate ?? -1) - (a.steam?.rating?.positiveRate ?? -1)
    )
  if (sortBy.value === 'reviews')
    list = [...list].sort(
      (a, b) => (b.steam?.rating?.totalReviews ?? -1) - (a.steam?.rating?.totalReviews ?? -1)
    )
  return list
})

function fmtMonth(m) {
  return `${m.slice(0, 4)}年${m.slice(4)}月`
}

onMounted(async () => {
  await load()
  // 进分类页 = 看过了：把追更的「新货」计数归零
  if (curCat) markFollowSeen(curCat)
})
</script>

<style scoped>
.cat-hero { padding: 56px 0 30px; text-align: center; position: relative; z-index: 1; }
.cat-hero__icon {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  margin-bottom: 16px;
}
.cat-hero__title {
  font-family: var(--font-display);
  font-size: 34px;
  font-weight: 700;
  margin-bottom: 6px;
}
.cat-follow {
  margin-top: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 100px;
  border: 1px solid var(--glass-border);
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--text-mid);
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}
.cat-follow:hover { color: var(--text-hi); border-color: var(--accent-gold); box-shadow: var(--shadow-glow); }
.cat-follow--on {
  color: #3b1e00;
  border-color: transparent;
  background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-deep));
  box-shadow: 0 4px 18px rgba(var(--accent-rgb), 0.35);
}
.cat-follow--on:hover { color: #3b1e00; }

.cat-tabs, .month-tabs { display: flex; gap: 10px; margin-bottom: 14px; position: relative; z-index: 1; }
.cat-tab, .month-tab {
  padding: 8px 18px;
  border-radius: 100px;
  font-size: 14px;
  color: var(--text-mid);
  border: 1px solid var(--glass-border);
  background: rgba(var(--accent-rgb), 0.04);
  transition: all 0.2s;
}
.cat-tab:hover, .month-tab:hover { color: var(--text-hi); border-color: var(--neon-purple); }
.cat-tab.active, .month-tab.active {
  color: #fff;
  background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-deep));
  border-color: transparent;
  box-shadow: 0 4px 16px rgba(var(--accent-rgb), 0.35);
}

.filters { margin-bottom: 22px; position: relative; z-index: 1; }
.filter-select { width: auto; min-width: 140px; }

/* 多维筛选面板 */
.dim-panel { border-radius: 16px; padding: 14px 16px 6px; margin-bottom: 16px; position: relative; z-index: 1; }
.dim-head { display: flex; align-items: center; gap: 10px; padding-bottom: 10px; }
.dim-head__title { font-weight: 700; font-size: 15px; }
.dim-head__count { font-size: 12.5px; color: var(--accent-gold-deep, #b45309); font-weight: 600; }
.dim-head__spacer { flex: 1; }
.dim-clear {
  border: none; background: none; cursor: pointer; font-size: 13px;
  color: var(--text-mid); text-decoration: underline; padding: 4px 2px;
}
.dim-toggle {
  display: none; border: 1px solid var(--glass-border); background: rgba(var(--accent-rgb), 0.05);
  color: var(--text-mid); border-radius: 999px; padding: 5px 14px; font-size: 13px; cursor: pointer;
}
.dim-row { display: flex; gap: 12px; padding: 7px 0; align-items: flex-start; }
.dim-row__label {
  flex: 0 0 40px; font-size: 13.5px; font-weight: 700; color: var(--text-mid);
  padding-top: 6px; text-align: justify; text-align-last: justify;
}
.dim-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.dim-chip {
  padding: 5px 13px; border-radius: 999px; font-size: 13px; cursor: pointer;
  color: var(--text-mid); border: 1px solid var(--glass-border);
  background: rgba(var(--accent-rgb), 0.04); transition: all 0.15s;
}
.dim-chip:hover { color: var(--text-hi); border-color: var(--accent-gold); }
.dim-chip.on {
  color: #fff; border-color: transparent;
  background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-deep));
  box-shadow: 0 3px 10px rgba(var(--accent-rgb), 0.3); font-weight: 600;
}
.dim-hint { font-size: 12px; margin: 6px 0 8px; }
@media (max-width: 768px) {
  .dim-toggle { display: inline-block; }
  .dim-body { display: none; }
  .dim-body.open { display: block; }
  .dim-row__label { flex-basis: 34px; font-size: 12.5px; }
  .dim-chip { padding: 4px 11px; font-size: 12.5px; }
}

.rc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.empty { padding: 60px 20px; text-align: center; }

@media (max-width: 1024px) { .rc-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) { .rc-grid { grid-template-columns: repeat(2, 1fr); padding: 0 8px; } }
@media (max-width: 480px) { .rc-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
