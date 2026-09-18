<template>
  <div class="search-box" ref="boxRef">
    <div class="search-bar" :class="{ focused }">
      <svg class="search-bar__icon" viewBox="0 0 20 20" fill="none" width="18" height="18">
        <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.6"/>
        <path d="M13.5 13.5L17 17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
      <input
        ref="inputRef"
        v-model="query"
        type="text"
        :placeholder="placeholder"
        class="search-bar__input"
        @focus="onFocus"
        @blur="onBlur"
        @keydown.enter="goSearch"
        @keydown.escape="focused = false"
      />
      <button v-if="query" class="search-bar__clear" @click="query = ''">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
      <button
        v-if="luckyResources.length"
        type="button"
        class="search-bar__lucky"
        @mousedown.prevent
        @click="luckySearch"
      >
        <span class="search-bar__lucky-die" aria-hidden="true">
          <span class="search-bar__lucky-die__cube">
            <span
              v-for="(face, fi) in DIE_FACES"
              :key="fi"
              class="search-bar__lucky-die__face"
              :style="{ transform: DIE_FACE_TRANSFORMS[fi] }"
            >
              <i v-for="(pip, pi) in face" :key="pi" :style="{ gridRow: pip[0], gridColumn: pip[1] }"></i>
            </span>
          </span>
        </span>
        <span>手气不错</span>
      </button>
    </div>

    <!-- 即时下拉结果（Teleport 到 body 根级，fixed 跟随输入框，置顶避免被任何元素遮挡） -->
    <Teleport to="body">
      <div v-if="focused && query" class="search-dropdown glass" :style="dropStyle">
        <div v-if="loadingData" class="search-dropdown__empty text-low">搜索中…</div>
        <div v-else-if="result.total === 0" class="search-dropdown__empty text-low">
          未找到「{{ query }}」相关资源，试试其他关键词
        </div>
        <template v-else>
          <div class="search-dropdown__meta text-low">{{ result.total }} 条结果</div>
          <a
            v-for="r in result.items.slice(0, 8)"
            :key="r.id"
            :href="detailHref(r.id)"
            class="search-dropdown__item"
            @mousedown.prevent
          >
            <span class="search-dropdown__dot" :style="{ background: catColor(r.category) }"></span>
            <span class="search-dropdown__title" v-html="highlight(r.title)"></span>
            <span class="badge">{{ catLabel(r.category) }}</span>
          </a>
          <a :href="`/search.html?q=${encodeURIComponent(query)}`" class="search-dropdown__more" @mousedown.prevent>
            查看全部结果 →
          </a>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useData } from '../composables/useData.js'
import { detailHref } from '../lib/short.js'
import { ensureIndex, search, searchOnResources, toHit } from '../lib/search.js'

const props = defineProps({
  placeholder: { type: String, default: '搜索游戏、资源名称...' },
  autofocus: { type: Boolean, default: false },
  // 首页传入「有封面的资源」池（home.json 的 coverPool）；为空时不渲染「手气不错」
  luckyResources: { type: Array, default: () => [] },
})

// 「手气不错」图标：真 3D 骰子。1~6 面的点数位置按 3×3 网格坐标 [行, 列] 摆放
const DIE_FACES = [
  [[2, 2]],
  [[1, 1], [3, 3]],
  [[1, 1], [2, 2], [3, 3]],
  [[1, 1], [1, 3], [3, 1], [3, 3]],
  [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
  [[1, 1], [1, 3], [2, 1], [2, 3], [3, 1], [3, 3]],
]
// 立方体 6 个面：前1/后6、右2/左5、上3/下4——对面点数之和均为 7，按真骰子来
const DIE_FACE_TRANSFORMS = [
  'translateZ(10px)',
  'rotateY(90deg) translateZ(10px)',
  'rotateX(90deg) translateZ(10px)',
  'rotateX(-90deg) translateZ(10px)',
  'rotateY(-90deg) translateZ(10px)',
  'rotateY(180deg) translateZ(10px)',
]

const { state, load, catLabel, catMeta } = useData()
const query = ref('')
const focused = ref(false)
// 首页走 loadHome()，state.resources 为空；首次输入时才按需拉搜索索引（~171KB），
// 不再为搜索拉 600KB 的 resources.json。
const loadingData = ref(false)
const indexReady = ref(false)
const indexDown = ref(false)
const inputRef = ref(null)
const boxRef = ref(null)

// 下拉框 Teleport 到 body 后的 fixed 定位（相对视口跟随搜索框）
const dropPos = ref({ top: 0, left: 0, width: 0, maxH: 420 })
const dropStyle = computed(() => ({
  position: 'fixed',
  top: `${dropPos.value.top}px`,
  left: `${dropPos.value.left}px`,
  width: `${dropPos.value.width}px`,
  maxHeight: `${dropPos.value.maxH}px`,
}))

// 搜索数据按需加载：优先索引；索引挂了才回退拉全量 resources.json（降落伞）
function ensureSearchData() {
  if (indexReady.value || loadingData.value) return
  loadingData.value = true
  ensureIndex()
    .then((recs) => {
      if (recs) {
        indexReady.value = true
        return null
      }
      indexDown.value = true
      return state.resources.length ? null : load()
    })
    .finally(() => (loadingData.value = false))
}

watch(query, (v) => {
  if (v.trim()) ensureSearchData()
})

function updateDropPos() {
  const el = boxRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const gap = 10
  const below = window.innerHeight - r.bottom - gap - 12
  const maxH = Math.min(420, Math.max(160, below))
  dropPos.value = { top: r.bottom + gap, left: r.left, width: r.width, maxH }
}

// 匹配逻辑不在这里：交给 src/lib/search.js（与 /search.html 共用同一套级联规则）
const result = computed(() => {
  const q = query.value.trim()
  if (!q) return { total: 0, items: [] }
  if (indexReady.value) {
    const r = search(q)
    if (r) return { total: r.total, items: r.hits.map(toHit) }
  }
  if (indexDown.value && state.resources.length) {
    const r = searchOnResources(state.resources, q)
    return { total: r.total, items: r.hits }
  }
  return { total: 0, items: [] }
})

function catColor(key) {
  const g = catMeta(key).gradient || ['#888', '#666']
  return g[0]
}
// 只在「查询串真的出现在标题里」时才高亮：
// 拼音命中 / 子序列命中 / 错字容错命中时 query 并不在文本中，
// 硬套正则会错高亮一段无关字符，所以这些情况整条不加标记。
function highlight(text) {
  const q = query.value.trim()
  if (!q) return escapeHtml(text)
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx >= 0) {
    const before = text.slice(0, idx)
    const hit = text.slice(idx, idx + q.length)
    const after = text.slice(idx + q.length)
    return `${escapeHtml(before)}<mark class="hl">${escapeHtml(hit)}</mark>${escapeHtml(after)}`
  }
  // 归一化后能对上（标题里带 _ - 空格等标点）：整条不高亮，避免错标
  return escapeHtml(text)
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}
function goSearch() {
  if (!query.value.trim()) return
  window.location.href = `/search.html?q=${encodeURIComponent(query.value.trim())}`
}
// 手气不错：从「有封面的资源」池随机抽一个，直接跳它的详情页
function luckySearch() {
  const pool = props.luckyResources
  if (!pool.length) return
  const r = pool[Math.floor(Math.random() * pool.length)]
  if (!r?.id) return
  window.location.href = detailHref(r.id)
}
function onFocus() {
  focused.value = true
  updateDropPos()
}
function onBlur() {
  setTimeout(() => (focused.value = false), 150)
}

// 全局 / 快捷键聚焦
function onKey(e) {
  if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    e.preventDefault()
    inputRef.value?.focus()
  }
}
function onScroll() {
  if (!focused.value) return
  const el = boxRef.value
  if (el) {
    const r = el.getBoundingClientRect()
    // 搜索框已滚出视口时收起下拉，避免 fixed 面板悬空
    if (r.bottom < 0 || r.top > window.innerHeight) {
      focused.value = false
      return
    }
  }
  updateDropPos()
}
onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', onScroll)
  // 仅非触屏设备自动聚焦：避免手机/平板跳转 search 页时直接弹出输入法键盘
  if (props.autofocus && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) {
    inputRef.value?.focus()
    nextTick(updateDropPos)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('resize', onScroll)
})
</script>

<style scoped>
.search-box { position: relative; z-index: 90; }
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 20px;
  border-radius: 16px;
  border: 1px solid var(--glass-border);
  background: rgba(var(--bg-1-rgb), 0.75);
  backdrop-filter: blur(16px);
  transition: all 0.25s;
}
.search-bar.focused {
  border-color: var(--neon-purple);
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.15), var(--shadow-glow);
}
.search-bar__icon { color: var(--text-low); flex-shrink: 0; }
.search-bar__input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-hi);
  font-size: 16px;
  min-width: 0;
}
.search-bar__input::placeholder { color: var(--text-low); }
.search-bar__clear {
  border: none;
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--text-mid);
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
/* 手气不错：透明气泡，颜色全部走主题变量，白天/黑夜自动适配 */
.search-bar__lucky {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  padding: 10px 18px;
  border-radius: 16px;
  border: none;
  box-shadow: none;
  background: var(--lucky-bg);
  color: var(--text-mid);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.25s, transform 0.1s;
}
/* 真 3D 骰子图标：立方体绕竖轴水平自转，六个面用网格小圆点画点数 */
.search-bar__lucky-die {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  perspective: 100px;
}
.search-bar__lucky-die__cube {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  /* 静止态（含 reduced-motion）也给个三维视角，别看起来像张平卡片 */
  transform: rotateX(-16deg) rotateY(-24deg);
  animation: lucky-die-spin 5s linear infinite;
}
/* 固定一个略俯视的视角，让立方体一望即知是骰子而非翻转的卡片 */
@keyframes lucky-die-spin {
  from { transform: rotateX(-16deg) rotateY(0deg); }
  to { transform: rotateX(-16deg) rotateY(360deg); }
}
.search-bar__lucky-die__face {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 2px;
  box-sizing: border-box;
  border-radius: 4px;
  background: var(--lucky-die-face);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.10);
  backface-visibility: hidden;
}
.search-bar__lucky-die__face i {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--lucky-die-pip);
  align-self: center;
  justify-self: center;
}
.search-bar__lucky:hover { background: var(--lucky-bg-hover); }
.search-bar__lucky:active { transform: scale(0.96); }
@media (prefers-reduced-motion: reduce) {
  .search-bar__lucky-die__cube { animation: none; }
}
.search-dropdown {
  /* Teleport 到 body 后由内联样式提供 fixed 定位；此处只管外观与层级 */
  border-radius: 14px;
  padding: 10px;
  overflow-y: auto;
  z-index: 10000; /* 根级置顶：盖过吸顶导航(z100)与页内一切内容 */
  /* 实底替代 .glass 的近乎透明背景，保证结果文字可读 */
  background: rgba(var(--bg-1-rgb), 0.96);
  border: 1px solid rgba(var(--accent-rgb), 0.28);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55), 0 2px 10px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
/* 覆盖 .glass:hover 的位移，下拉框不应整体浮动 */
.search-dropdown.glass:hover {
  transform: none;
  border-color: rgba(var(--accent-rgb), 0.28);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
}
.search-dropdown__meta { font-size: 12px; padding: 4px 8px 8px; }
.search-dropdown__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  transition: background 0.15s;
}
.search-dropdown__item:hover { background: rgba(var(--accent-rgb), 0.18); }
.search-dropdown__dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.search-dropdown__title { flex: 1; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.search-dropdown__empty { padding: 18px; text-align: center; font-size: 14px; }
.search-dropdown__more {
  display: block;
  text-align: center;
  padding: 10px;
  font-size: 13px;
  color: var(--neon-cyan);
  border-top: 1px solid var(--glass-border);
  margin-top: 6px;
}
:deep(.hl) {
  background: rgba(var(--accent-rgb), 0.35);
  color: var(--text-hi);
  border-radius: 3px;
  padding: 0 2px;
}
</style>
