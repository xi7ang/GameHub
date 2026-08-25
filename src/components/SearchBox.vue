<template>
  <div class="search-box">
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
        @focus="focused = true"
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

    <!-- 即时下拉结果 -->
    <div v-if="focused && query" class="search-dropdown glass">
      <div v-if="results.length === 0" class="search-dropdown__empty text-low">
        未找到「{{ query }}」相关资源，试试其他关键词
      </div>
      <template v-else>
        <div class="search-dropdown__meta text-low">{{ results.length }} 条结果</div>
        <a
          v-for="r in results.slice(0, 8)"
          :key="r.id"
          :href="`/GameHub/resource.html?id=${r.id}`"
          class="search-dropdown__item"
          @mousedown.prevent
        >
          <span class="search-dropdown__dot" :style="{ background: catColor(r.category) }"></span>
          <span class="search-dropdown__title" v-html="highlight(r.title)"></span>
          <span class="badge">{{ catLabel(r.category) }}</span>
          <span class="badge">{{ platformLabel(r.platform) }}</span>
        </a>
        <a :href="`/GameHub/search.html?q=${encodeURIComponent(query)}`" class="search-dropdown__more" @mousedown.prevent>
          查看全部结果 →
        </a>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useData } from '../composables/useData.js'

const props = defineProps({
  placeholder: { type: String, default: '搜索游戏、资源名称...' },
  autofocus: { type: Boolean, default: false },
})

const { state, catLabel, catMeta } = useData()
const query = ref('')
const focused = ref(false)
const inputRef = ref(null)

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
  window.location.href = `/GameHub/search.html?q=${encodeURIComponent(query.value.trim())}`
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
onMounted(() => {
  window.addEventListener('keydown', onKey)
  if (props.autofocus) inputRef.value?.focus()
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
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
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  right: 0;
  border-radius: 14px;
  padding: 10px;
  max-height: 420px;
  overflow-y: auto;
  z-index: 95;
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
.search-dropdown__item:hover { background: rgba(var(--accent-rgb), 0.12); }
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
