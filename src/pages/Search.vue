<template>
  <div class="search-page">
    <SiteHeader />
    <BgWall />

    <section class="search-hero">
      <div class="container">
        <h1 class="search-hero__title">🔍 资源搜索</h1>
        <div class="search-hero__box">
          <SearchBox :autofocus="true" />
        </div>
      </div>
    </section>

    <section class="container">
      <div v-if="!q" class="empty glass">
        <div style="font-size: 40px; margin-bottom: 10px">⌨️</div>
        <p>输入关键词搜索游戏资源（支持 / 快捷键聚焦）</p>
      </div>

      <template v-else>
        <div class="result-meta">
          <span>「<em class="neon-cyan">{{ q }}</em>」共找到 <strong>{{ results.length }}</strong> 个资源</span>
          <span v-if="!results.length" class="text-low">试试其他关键词，或检查是否包含空格</span>
        </div>

        <!-- 按分类聚合 -->
        <section v-for="group in grouped" :key="group.key" class="mb-md">
          <h3 class="group-title">
            {{ group.meta.emoji }} {{ group.meta.name }}
            <span class="text-low" style="font-size: 13px">（{{ group.items.length }}）</span>
          </h3>
          <div class="rc-grid">
            <ResourceCard v-for="r in group.items" :key="r.id" :r="r" />
          </div>
        </section>
      </template>
    </section>

    <SiteFooter />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'
import BgWall from '../components/BgWall.vue'
import SearchBox from '../components/SearchBox.vue'
import ResourceCard from '../components/ResourceCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { useData } from '../composables/useData.js'
import { ensureIndex, search, searchOnResources, ID } from '../lib/search.js'

const { state, load, catMeta } = useData()
const params = new URLSearchParams(location.search)
const q = ref(params.get('q') || '')
const indexReady = ref(false)

// 匹配交给 src/lib/search.js 的级联规则（与首页下拉框共用一套）。
// 这里仍要 load() 全量：搜索页要渲染 ResourceCard，卡片需要封面/体积等完整字段；
// 索引只用来决定「哪些 id、什么顺序」。
const results = computed(() => {
  const query = q.value.trim()
  if (!query) return []
  if (indexReady.value) {
    const r = search(query)
    if (r) {
      const byId = new Map(state.resources.map((x) => [x.id, x]))
      return r.hits.map((it) => byId.get(it[ID])).filter(Boolean)
    }
  }
  if (state.resources.length) return searchOnResources(state.resources, query).hits
  return []
})

const grouped = computed(() => {
  const map = new Map()
  for (const r of results.value) {
    if (!map.has(r.category)) map.set(r.category, [])
    map.get(r.category).push(r)
  }
  return [...map.entries()].map(([key, items]) => ({ key, meta: catMeta(key), items }))
})

// 搜索框输入同步 URL（防抖）
let timer = null
function syncQ() {
  // 由 SearchBox 内部跳转驱动，这里只读初始值
}
onMounted(async () => {
  const recs = await ensureIndex()
  indexReady.value = !!recs
  load()
  syncQ()
})
</script>

<style scoped>
.search-hero { padding: 56px 0 30px; text-align: center; position: relative; z-index: 1; }
.search-hero__title { font-family: var(--font-display); font-size: 32px; font-weight: 700; margin-bottom: 22px; }
.search-hero__box { max-width: 640px; margin: 0 auto; }

.result-meta { font-size: 15px; margin-bottom: 20px; position: relative; z-index: 1; }
.group-title { font-size: 18px; font-weight: 700; margin-bottom: 14px; }
.rc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.empty { padding: 60px 20px; text-align: center; margin: 40px 0; }

@media (max-width: 1024px) { .rc-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) { .rc-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .rc-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
