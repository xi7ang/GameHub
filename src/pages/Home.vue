<template>
  <div class="home">
    <SiteHeader />
    <BgWall />

    <!-- Hero -->
    <section class="hero">
      <div class="container hero__inner">
        <span class="hero__eyebrow">🎮 GAME RESOURCE LIBRARY</span>
        <h1 class="hero__title">发现全网<br /><em>优质游戏资源</em></h1>
        <p class="hero__subtitle">{{ site?.slogan }} · 单机 / 手游 / Switch / MOD 一站式聚合</p>
        <div class="hero__search">
          <SearchBox />
        </div>
        <div class="hero__hot">
          <span class="text-low">热门：</span>
          <a
            v-for="k in site?.hotKeywords || []"
            :key="k"
            :href="`/GameHub/search.html?q=${encodeURIComponent(k)}`"
            class="hot-tag"
          >{{ k }}</a>
        </div>
      </div>
    </section>

    <!-- 分类宫格 -->
    <section class="container section">
      <h2 class="section-title">🗂️ 资源分类</h2>
      <div class="cat-grid">
        <a
          v-for="(c, i) in state.categories"
          :key="c.key"
          :href="`/GameHub/category.html?cat=${c.key}`"
          class="cat-card glass fade-up"
          :class="`fade-up-${(i % 3) + 1}`"
        >
          <div class="cat-card__icon" :style="iconStyle(c)">{{ c.emoji }}</div>
          <div class="cat-card__name">{{ c.name }}</div>
          <div class="cat-card__count text-low">{{ countBy(c.key) }} 个资源</div>
        </a>
      </div>
    </section>

    <!-- 推荐资源 -->
    <section v-if="featured.length" class="container section">
      <h2 class="section-title">🔥 精选推荐</h2>
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

    <!-- 最新动态 -->
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

    <!-- 数据统计条（页脚上方） -->
    <section class="container stats fade-up">
      <div class="stat">
        <div class="stat__num">{{ state.resources.length }}</div>
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
</template>

<script setup>
import { computed, onMounted } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'
import BgWall from '../components/BgWall.vue'
import SearchBox from '../components/SearchBox.vue'
import ResourceCard from '../components/ResourceCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { useData } from '../composables/useData.js'

const { state, load } = useData()
const site = state.site

const featured = computed(() => state.resources.filter((r) => r.featured).slice(0, 8))
const latest = computed(() => state.resources.filter((r) => !r.featured).slice(0, 12))
const lastMonthCount = computed(() => {
  const now = new Date()
  const m = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  return state.resources.filter((r) => r.month === m).length
})

function countBy(key) {
  return state.resources.filter((r) => r.category === key).length
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

onMounted(load)
</script>

<style scoped>
.home { min-height: 100vh; }

/* Hero */
.hero { padding: 90px 0 50px; text-align: center; position: relative; z-index: 1; }
.hero__eyebrow {
  display: inline-block;
  padding: 6px 18px;
  border-radius: 100px;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--neon-cyan);
  border: 1px solid rgba(var(--accent2-rgb), 0.3);
  background: rgba(var(--accent2-rgb), 0.06);
  margin-bottom: 22px;
  animation: fadeInUp 0.6s ease-out;
}
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
.hero__search { max-width: 640px; margin: 0 auto; animation: fadeInUp 0.6s ease-out 0.24s both; }
.hero__hot { margin-top: 20px; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; animation: fadeInUp 0.6s ease-out 0.32s both; }
.hot-tag {
  padding: 5px 14px;
  border-radius: 100px;
  font-size: 12px;
  color: var(--text-mid);
  border: 1px solid var(--glass-border);
  background: rgba(var(--accent-rgb), 0.05);
  transition: all 0.2s;
}
.hot-tag:hover { color: var(--neon-cyan); border-color: var(--neon-cyan); }

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
}
@media (max-width: 480px) {
  .rc-grid { grid-template-columns: 1fr; }
  .cat-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
