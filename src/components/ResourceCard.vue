<template>
  <a :href="`/GameHub/resource.html?id=${r.id}`" class="rc">
    <!-- 封面：有 cover 用图，无则霓虹渐变 -->
    <div class="rc__cover" :style="coverStyle">
      <img v-if="r.cover" :src="r.cover" :alt="r.title" loading="lazy" />
      <template v-else>
        <span class="rc__cover-title">{{ r.title }}</span>
        <span class="rc__cover-glow"></span>
      </template>
      <span v-if="r.platform && site?.platforms?.[r.platform]" class="rc__platform">{{ site.platforms[r.platform].icon }}</span>
      <span v-if="r.featured" class="rc__featured">🔥 推荐</span>
      <span v-if="r.status === 'inactive'" class="rc__inactive">链接失效</span>
    </div>
    <div class="rc__body">
      <h3 class="rc__title">{{ r.title }}</h3>
      <p v-if="r.desc" class="rc__desc text-low">{{ r.desc }}</p>
      <div class="rc__meta">
        <span class="badge">{{ catLabel(r.category) }}</span>
        <span v-if="r.size" class="rc__size">{{ r.size }}</span>
        <span class="rc__date text-low">{{ fmtDate(r.addedAt) }}</span>
      </div>
    </div>
  </a>
</template>

<script setup>
import { computed } from 'vue'
import { useData } from '../composables/useData.js'

const props = defineProps({ r: { type: Object, required: true } })
const { state, catLabel, catMeta } = useData()
const site = state.site

function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
const GRADS = [
  ['#8b5cf6', '#6366f1'],
  ['#22d3ee', '#3b82f6'],
  ['#f472b6', '#a855f7'],
  ['#34d399', '#0ea5e9'],
  ['#fbbf24', '#f97316'],
  ['#fb7185', '#e11d48'],
]
const coverStyle = computed(() => {
  const meta = catMeta(props.r.category)
  const [a, b] = meta.gradient || GRADS[hashStr(props.r.title) % GRADS.length]
  const deg = hashStr(props.r.title + 'c') % 360
  return {
    background: `linear-gradient(${deg}deg, ${a}cc, ${b}99)`,
    border: `1px solid ${a}66`,
  }
})
function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
.rc {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(10px);
  transition: all 0.25s ease;
  height: 100%;
}
.rc:hover {
  transform: translateY(-4px);
  border-color: rgba(139, 92, 246, 0.45);
  box-shadow: var(--shadow-glow);
}
.rc__cover {
  position: relative;
  aspect-ratio: 16 / 10;
  display: flex;
  align-items: flex-end;
  padding: 12px;
  overflow: hidden;
}
.rc__cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.rc__cover-title {
  position: relative;
  z-index: 2;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.7);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rc__cover-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(0, 0, 0, 0.55));
}
.rc__platform {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  font-size: 15px;
  background: rgba(5, 5, 14, 0.6);
  border-radius: 8px;
  padding: 3px 7px;
  backdrop-filter: blur(4px);
}
.rc__featured {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 3;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #f97316, #f43f5e);
  border-radius: 100px;
  padding: 3px 9px;
}
.rc__inactive {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 5, 14, 0.75);
  color: #fb7185;
  font-weight: 700;
  font-size: 14px;
}
.rc__body { padding: 14px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.rc__title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rc__desc {
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rc__meta { display: flex; align-items: center; gap: 8px; margin-top: auto; flex-wrap: wrap; }
.rc__size { font-size: 12px; color: var(--neon-cyan); font-weight: 600; }
.rc__date { font-size: 12px; margin-left: auto; }
</style>
