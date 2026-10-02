<template>
  <div class="favorites-page">
    <SiteHeader />
    <BgWall />

    <section class="page-hero">
      <div class="container">
        <h1 class="page-hero__title">⭐ 我的收藏</h1>
        <p class="page-hero__sub text-low">收藏与追更只存在你自己的浏览器里，不上传服务器</p>
      </div>
    </section>

    <section class="container section">
      <!-- 我追的分类 -->
      <template v-if="followItems.length">
        <h2 class="section-title">🔔 我追的分类</h2>
        <div class="follow-list">
          <a
            v-for="f in followItems"
            :key="f.key"
            :href="`/category.html?cat=${f.key}`"
            class="follow-card glass"
            @click="markFollowSeen(f.key)"
          >
            <span class="follow-card__icon">{{ f.emoji }}</span>
            <span class="follow-card__body">
              <span class="follow-card__name">{{ f.name }}</span>
              <span class="follow-card__new" :class="{ 'is-zero': !f.count }">
                {{ f.count ? `有 ${f.count} 条新货` : '暂无新货' }}
              </span>
            </span>
            <button class="follow-card__off" type="button" @click.prevent.stop="toggleFollowCat(f.key)">取消追更</button>
          </a>
        </div>
      </template>

      <!-- 已收藏资源 -->
      <h2 class="section-title">📚 已收藏资源 <span v-if="favCount()" class="section-title__count">{{ favCount() }}</span></h2>

      <div v-if="state.loading" class="rc-grid">
        <div v-for="i in 4" :key="i" class="skeleton" style="height: 260px"></div>
      </div>
      <div v-else-if="favCards.length" class="rc-grid">
        <div v-for="f in favCards" :key="f.id" class="fav-item">
          <ResourceCard :r="f" />
          <button class="fav-item__del" type="button" title="取消收藏" @click="onRemove(f.id)">✕ 取消收藏</button>
        </div>
      </div>
      <div v-else class="empty glass">
        <div style="font-size: 40px; margin-bottom: 10px">🤍</div>
        <p>还没有收藏。去资源详情页点「☆ 收藏」，下次就能在这里找到。</p>
        <a href="/category.html" class="btn btn-primary mt-md">去逛逛资源库</a>
      </div>

      <p v-if="!followItems.length && favCount()" class="follow-hint text-low">
        想追更某个分类的新货？去 <a href="/category.html">资源库</a> 打开分类，点「☆ 追更这个分类」。
      </p>
    </section>

    <SiteFooter />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'
import BgWall from '../components/BgWall.vue'
import ResourceCard from '../components/ResourceCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { useData } from '../composables/useData.js'
import { useFavorites } from '../composables/useFavorites.js'

const { state, load, catMeta } = useData()
const { listFavs, removeFav, favCount, followedCats, toggleFollowCat, markFollowSeen, newCountFor } = useFavorites()

// 收藏快照只有 id/title/cover/addedAt/updatedAt，缺 category 等卡片字段。
// 优先用已加载的全量资源合并出完整卡片；资源已被移除时退回快照（渲染仍可用）。
const favCards = computed(() =>
  listFavs().map((f) => {
    const full = state.resources.find((r) => r.id === f.id)
    if (full) return full
    return { ...f, category: '', tags: [], status: 'active', featured: false, size: '' }
  })
)

const followItems = computed(() =>
  followedCats().map((k) => {
    const c = catMeta(k)
    return { key: k, name: c.name, emoji: c.emoji, count: newCountFor(k, state.resources) }
  })
)

function onRemove(id) {
  removeFav(id)
}

onMounted(load)
</script>

<style scoped>
.favorites-page { min-height: 100vh; }
.page-hero { padding: 58px 0 22px; text-align: center; position: relative; z-index: 1; }
.page-hero__title { font-family: var(--font-display); font-size: clamp(28px, 4vw, 40px); font-weight: 700; }
.page-hero__sub { margin-top: 8px; font-size: 14px; }
.section-title__count {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-mid);
  background: rgba(var(--accent-rgb), 0.12);
  border-radius: 100px;
  padding: 1px 10px;
  align-self: center;
}

/* 我追的分类 */
.follow-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 34px;
}
.follow-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  position: relative;
  z-index: 1;
}
.follow-card__icon { font-size: 24px; flex: none; }
.follow-card__body { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.follow-card__name { font-size: 15px; font-weight: 700; }
.follow-card__new { font-size: 12.5px; font-weight: 600; color: var(--accent-terracotta); }
.follow-card__new.is-zero { color: var(--text-low); font-weight: 500; }
.follow-card__off {
  flex: none;
  border: 1px solid var(--glass-border);
  background: transparent;
  color: var(--text-low);
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 100px;
  transition: all 0.2s;
}
.follow-card__off:hover { color: #fb7185; border-color: rgba(244, 63, 94, 0.45); }

/* 收藏卡片 + 取消按钮 */
.rc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.fav-item { position: relative; }
.fav-item__del {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 6;
  padding: 4px 10px;
  border-radius: 100px;
  border: 1px solid rgba(244, 63, 94, 0.35);
  background: rgba(10, 10, 20, 0.72);
  color: #fb7185;
  font-size: 11.5px;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s;
}
.fav-item:hover .fav-item__del,
.fav-item__del:focus-visible { opacity: 1; }
.fav-item__del:hover { background: rgba(244, 63, 94, 0.9); color: #fff; }

.empty { padding: 56px 20px; text-align: center; }
.follow-hint { margin-top: 22px; font-size: 13px; }
.follow-hint a { color: var(--accent-gold); text-decoration: underline; text-underline-offset: 3px; }

/* 触屏没有 hover：直接显示取消按钮 */
@media (hover: none) {
  .fav-item__del { opacity: 1; }
}
@media (max-width: 1024px) {
  .rc-grid { grid-template-columns: repeat(3, 1fr); }
  .follow-list { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .rc-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .rc-grid { grid-template-columns: repeat(2, 1fr); }
  .follow-list { grid-template-columns: 1fr; }
}
</style>
