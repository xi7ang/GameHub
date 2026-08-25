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
      </div>
    </section>

    <section class="container">
      <!-- 分类切换 -->
      <div class="cat-tabs wrap">
        <a
          :href="`/GameHub/category.html${curCat ? '?cat=' + curCat : ''}`"
          class="cat-tab"
          :class="{ active: !curCat }"
        >全部</a>
        <a
          v-for="c in state.categories"
          :key="c.key"
          :href="`/GameHub/category.html?cat=${c.key}`"
          class="cat-tab"
          :class="{ active: curCat === c.key }"
        >{{ c.emoji }} {{ c.name }}</a>
      </div>

      <!-- 月份归档 -->
      <div v-if="months.length > 1" class="month-tabs wrap">
        <a
          :href="`/GameHub/category.html?cat=${curCat || ''}&month=${m}`"
          class="month-tab"
          :class="{ active: curMonth === m }"
        >{{ fmtMonth(m) }}</a>
        <a
          v-if="curMonth"
          :href="`/GameHub/category.html?cat=${curCat || ''}`"
          class="month-tab"
        >全部月份</a>
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
        <p>该分类下暂无资源，去看看其他分类吧</p>
        <a href="/GameHub/" class="btn btn-primary mt-md">返回首页</a>
      </div>
    </section>

    <SiteFooter />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'
import BgWall from '../components/BgWall.vue'
import ResourceCard from '../components/ResourceCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { useData } from '../composables/useData.js'

const { state, load, catMeta } = useData()
const site = state.site

const params = new URLSearchParams(location.search)
const curCat = params.get('cat')
const curMonth = params.get('month')

const platformFilter = ref('')
const sortBy = ref('newest')

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
  if (sortBy.value === 'newest') list = [...list].sort((a, b) => b.addedAt.localeCompare(a.addedAt))
  if (sortBy.value === 'oldest') list = [...list].sort((a, b) => a.addedAt.localeCompare(b.addedAt))
  if (sortBy.value === 'size') list = [...list].sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0))
  return list
})

function fmtMonth(m) {
  return `${m.slice(0, 4)}年${m.slice(4)}月`
}

onMounted(load)
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

.rc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.empty { padding: 60px 20px; text-align: center; }

@media (max-width: 1024px) { .rc-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) { .rc-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .rc-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
