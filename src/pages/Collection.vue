<template>
  <div class="collection-page">
    <SiteHeader />
    <BgWall />

    <!-- 合集头 -->
    <section class="col-hero">
      <div class="container col-hero__inner">
        <div class="col-hero__icon">{{ cur?.emoji || '🏆' }}</div>
        <h1 class="col-hero__title">{{ cur?.name || '必玩合集' }}</h1>
        <p class="col-hero__sub text-low">{{ cur?.desc || '' }}</p>
        <p class="col-hero__count text-low">共 {{ cur?.items?.length || 0 }} 款 · 每款游戏只进一个榜单，不重复出现</p>
      </div>
    </section>

    <section class="container">
      <!-- 合集切换 -->
      <div class="col-tabs wrap">
        <a
          v-for="c in collections"
          :key="c.id"
          :href="`/collection.html?id=${c.id}`"
          class="col-tab"
          :class="{ active: cur?.id === c.id }"
        >{{ c.emoji }} {{ c.name }}</a>
      </div>

      <!-- 资源网格（带名次角标） -->
      <div v-if="loading" class="rc-grid">
        <div v-for="i in 8" :key="i" class="skeleton" style="height: 260px"></div>
      </div>
      <div v-else-if="cur?.items?.length" class="rc-grid">
        <div v-for="(r, i) in cur.items" :key="r.id" class="rank-wrap">
          <div class="rank-line">
            <span class="rank-badge" :class="{ 'rank-badge--top': i < 3 }">第 {{ i + 1 }} 名</span>
            <span v-if="r.mostPlayedRank" class="mp-badge">🔥 官方热玩榜第 {{ r.mostPlayedRank }}</span>
          </div>
          <ResourceCard :r="r" />
        </div>
      </div>
      <div v-else class="empty glass">
        <div style="font-size: 40px; margin-bottom: 10px">🏆</div>
        <p class="text-low">这个合集暂时没有内容</p>
      </div>

      <p class="col-note text-low">
        入选规则：全站必玩守好评率 ≥95% 且评测数 ≥3 万的口碑线，品类榜为 ≥90% 且评测数 ≥5000；一款游戏只进一个榜单（全站优先，品类榜不重复收录）；同游戏多版本只取其一；上过 Steam 官方「最多游玩」榜的优先靠前，其余按评测数排序。数据随站点每日更新自动重算。
      </p>
    </section>

    <SiteFooter />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'
import BgWall from '../components/BgWall.vue'
import ResourceCard from '../components/ResourceCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { BUILD_ID } from '../lib/version.js'

const collections = ref([])
const loading = ref(true)
const curId = new URLSearchParams(location.search).get('id') || 'all'
const cur = computed(
  () => collections.value.find((c) => c.id === curId) || collections.value[0] || null
)

onMounted(async () => {
  try {
    const res = await fetch(
      `${import.meta.env.BASE_URL}data/collections.json?v=${BUILD_ID || Date.now()}`
    )
    const j = await res.json()
    collections.value = j.collections || []
    if (cur.value) document.title = `${cur.value.name} - GameHub 游戏资源库`
  } catch {
    collections.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.col-hero { padding: 48px 0 8px; text-align: center; }
.col-hero__icon { font-size: 44px; margin-bottom: 8px; }
.col-hero__title { font-size: 30px; margin: 0 0 8px; }
.col-hero__sub { max-width: 640px; margin: 0 auto 6px; }
.col-hero__count { margin: 0; font-size: 13px; }
.col-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin: 22px 0 18px; }
.col-tab {
  padding: 7px 14px; border-radius: 999px; text-decoration: none;
  border: 1px solid var(--border, rgba(127, 127, 127, 0.35)); color: inherit; font-size: 14px;
}
.col-tab.active { background: var(--accent, #2563eb); color: #fff; border-color: transparent; }
.rc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.rank-line { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; min-height: 24px; }
.rank-badge {
  padding: 2px 10px; border-radius: 8px;
  background: rgba(15, 23, 42, 0.82); color: #fff; font-weight: 700; font-size: 13px;
}
.rank-badge--top { background: #d97706; }
.mp-badge {
  padding: 2px 8px; border-radius: 999px; font-size: 11px;
  background: rgba(185, 28, 28, 0.88); color: #fff;
}
.col-note { margin: 26px 0 40px; font-size: 13px; line-height: 1.7; }
.empty { padding: 48px 0; text-align: center; border-radius: 16px; margin-bottom: 40px; }
@media (max-width: 1024px) { .rc-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) { .rc-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
