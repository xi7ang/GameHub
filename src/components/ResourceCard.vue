<template>
  <a :href="`/GameHub/resource.html?id=${r.id}`" class="rc">
    <!-- 封面：有 cover 用图，无则霓虹渐变 + 游戏名伪封面 -->
    <div class="rc__cover" :style="coverStyle">
      <img v-if="r.cover" :src="r.cover" :alt="r.title" loading="lazy" />
      <template v-else>
        <span class="rc__cover-halo" :style="haloStyle"></span>
        <span class="rc__cover-emoji">{{ catMeta(r.category).emoji }}</span>
        <span class="rc__cover-title">{{ r.title }}</span>
      </template>
      <span v-if="r.featured" class="rc__featured">🔥 推荐</span>
      <span v-if="r.status === 'inactive'" class="rc__inactive">链接失效</span>
    </div>
    <div class="rc__body">
      <h3 class="rc__title">{{ r.title }}</h3>
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

function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
const GRADS = [
  ['#c99a5b', '#a87b3f'],
  ['#7d9cb3', '#4f6d8a'],
  ['#c46a4a', '#8a5a9a'],
  ['#7da37d', '#5d7c93'],
  ['#b08a5f', '#8a6844'],
  ['#fb7185', '#e11d48'],
]
const coverStyle = computed(() => {
  if (props.r.cover) return {}
  const meta = catMeta(props.r.category)
  const [a, b] = meta.gradient || GRADS[hashStr(props.r.title) % GRADS.length]
  const deg = hashStr(props.r.title + 'c') % 360
  return {
    background: `linear-gradient(${deg}deg, ${a} 0%, ${b} 100%)`,
  }
})
const haloStyle = computed(() => {
  if (props.r.cover) return {}
  const meta = catMeta(props.r.category)
  const [a] = meta.gradient || GRADS[hashStr(props.r.title) % GRADS.length]
  return {
    background: `radial-gradient(circle at 50% 35%, ${a}55 0%, transparent 70%)`,
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
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius);
  overflow: hidden;
  /* 游戏卡牌风：渐变描边（双背景技巧）+ 深色内底 */
  background:
    linear-gradient(var(--bg-1), var(--bg-1)) padding-box,
    linear-gradient(160deg, rgba(201, 154, 91, 0.65) 0%, rgba(201, 154, 91, 0.12) 35%, rgba(125, 156, 179, 0.3) 70%, rgba(201, 154, 91, 0.55) 100%) border-box;
  border: 1.5px solid transparent;
  transition: all 0.25s ease;
  height: 100%;
}
/* 顶部稀有度光条（游戏卡牌质感） */
.rc::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  z-index: 3;
  background: linear-gradient(90deg, transparent, rgba(201, 154, 91, 0.85), rgba(125, 156, 179, 0.5), transparent);
  opacity: 0.7;
  transition: opacity 0.25s;
}
/* 右下角切角（游戏 UI 常见元素） */
.rc::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  width: 18px;
  height: 18px;
  z-index: 3;
  background: linear-gradient(225deg, transparent 50%, rgba(201, 154, 91, 0.35) 50%);
  border-bottom-right-radius: var(--radius);
  pointer-events: none;
}
.rc:hover {
  transform: translateY(-4px);
  background:
    linear-gradient(var(--bg-1), var(--bg-1)) padding-box,
    linear-gradient(160deg, rgba(201, 154, 91, 0.9) 0%, rgba(201, 154, 91, 0.2) 35%, rgba(125, 156, 179, 0.45) 70%, rgba(201, 154, 91, 0.8) 100%) border-box;
  box-shadow: var(--shadow-glow);
}
.rc:hover::before {
  opacity: 1;
  box-shadow: 0 0 12px rgba(201, 154, 91, 0.4);
}
.rc__cover {
  position: relative;
  aspect-ratio: 16 / 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  overflow: hidden;
}
.rc__cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.rc__cover-halo {
  position: absolute;
  inset: -20%;
  z-index: 1;
  pointer-events: none;
}
.rc__cover-emoji {
  position: relative;
  z-index: 2;
  font-size: 26px;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
}
.rc__cover-title {
  position: relative;
  z-index: 2;
  font-family: var(--font-display);
  font-size: clamp(14px, 2.2vw, 19px);
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.75), 0 0 24px rgba(255, 255, 255, 0.25);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-align: center;
  line-height: 1.35;
  max-width: 95%;
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
  background: rgba(var(--bg-0-rgb), 0.75);
  color: #fb7185;
  font-weight: 700;
  font-size: 14px;
}
.rc__body { padding: 14px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
.rc__title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rc__meta { display: flex; align-items: center; gap: 8px; margin-top: auto; flex-wrap: wrap; }
.rc__size { font-size: 12px; color: var(--neon-cyan); font-weight: 600; }
.rc__date { font-size: 12px; margin-left: auto; }
</style>
