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
    </div>

    <!-- 即时下拉结果（Teleport 到 body 根级，fixed 跟随输入框，置顶避免被任何元素遮挡） -->
    <Teleport to="body">
      <div v-if="focused && query" class="search-dropdown glass" :style="dropStyle">
        <div v-if="results.length === 0" class="search-dropdown__empty text-low">
          未找到「{{ query }}」相关资源，试试其他关键词
        </div>
        <template v-else>
          <div class="search-dropdown__meta text-low">{{ results.length }} 条结果</div>
          <a
            v-for="r in results.slice(0, 8)"
            :key="r.id"
            :href="detailHref(r.id)"
            class="search-dropdown__item"
            @mousedown.prevent
          >
            <span class="search-dropdown__dot" :style="{ background: catColor(r.category) }"></span>
            <span class="search-dropdown__title" v-html="highlight(r.title)"></span>
            <span class="badge">{{ catLabel(r.category) }}</span>
            <span class="badge">{{ platformLabel(r.platform) }}</span>
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
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useData } from '../composables/useData.js'
import { detailHref } from '../lib/short.js'

const props = defineProps({
  placeholder: { type: String, default: '搜索游戏、资源名称...' },
  autofocus: { type: Boolean, default: false },
})

const { state, catLabel, catMeta } = useData()
const query = ref('')
const focused = ref(false)
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

function updateDropPos() {
  const el = boxRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const gap = 10
  const below = window.innerHeight - r.bottom - gap - 12
  const maxH = Math.min(420, Math.max(160, below))
  dropPos.value = { top: r.bottom + gap, left: r.left, width: r.width, maxH }
}

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return state.resources.filter((r) => {
    const hay = `${r.title} ${r.enTitle || ''} ${(r.tags || []).join(' ')} ${r.category} ${r.desc || ''}`.toLowerCase()
    return hay.includes(q)
  })
})

function catColor(key) {
  const g = catMeta(key).gradient || ['#888', '#666']
  return g[0]
}
function platformLabel(p) {
  return state.site?.platforms?.[p]?.label || p
}
function highlight(text) {
  const q = query.value.trim()
  if (!q) return text
  const esc = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const qesc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${qesc})`, 'gi')
  return esc.replace(re, '<mark class="hl">$1</mark>')
}
function goSearch() {
  if (!query.value.trim()) return
  window.location.href = `/search.html?q=${encodeURIComponent(query.value.trim())}`
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
