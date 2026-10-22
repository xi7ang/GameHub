<template>
  <a :href="detailHref(r.id)" class="rc">
    <!-- 封面：有 cover 用图，无则霓虹渐变 + 游戏名伪封面 -->
    <div class="rc__cover" :style="coverStyle">
      <img v-if="r.cover" :src="r.cover" :alt="r.title" loading="lazy" />
      <template v-else>
        <span class="rc__cover-halo" :style="haloStyle"></span>
        <span class="rc__cover-emoji">{{ catMeta(r.category).emoji }}</span>
        <span class="rc__cover-title">{{ r.title }}</span>
      </template>
      <span v-if="r.featured" class="rc__featured">🔥 推荐</span>
      <!-- 右上角信息角标：Steam 评价 / 体积 / 发行年份，有数据才显示 -->
      <div v-if="ratingText || r.size || releaseYear" class="rc__pills">
        <span v-if="ratingText" class="rc__pill">{{ ratingText }}</span>
        <span v-if="r.size" class="rc__pill">{{ sizeText }}</span>
        <span v-if="releaseYear" class="rc__pill">{{ releaseYear }}</span>
      </div>
      <span v-if="r.status === 'inactive'" class="rc__inactive">链接失效</span>
    </div>
    <div class="rc__body">
      <div class="rc__titlerow">
        <span v-if="isUpdated" class="rc__upd">更新</span>
        <h3 class="rc__title">{{ displayTitle }}</h3>
      </div>
      <div v-if="chips.length" class="rc__chips">
        <span class="rc__chip rc__chip--first">{{ catMeta(r.category).emoji }} {{ chips[0] }}</span>
        <span v-for="c in chips.slice(1)" :key="c" class="rc__chip"># {{ c }}</span>
      </div>
      <div class="rc__foot">
        <span class="rc__date text-low"><span class="rc__dot"></span>{{ footDate }}</span>
        <span v-if="viewsText" class="rc__views text-low">👁 {{ viewsText }}</span>
      </div>
    </div>
  </a>
</template>

<script setup>
import { computed } from 'vue'
import { useData } from '../composables/useData.js'
import { detailHref } from '../lib/short.js'

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

// ── 卡片展示字段（全部有数据才显示，不编造） ──
// Steam 评价：appreviews 的英文等级 → 中文（与 Steam 商店中文文案一致）
const RATING_ZH = {
  'Overwhelmingly Positive': '好评如潮',
  'Very Positive': '特别好评',
  'Positive': '好评',
  'Mostly Positive': '多半好评',
  'Mixed': '褒贬不一',
  'Mostly Negative': '多半差评',
  'Negative': '差评',
  'Very Negative': '特别差评',
  'Overwhelmingly Negative': '差评如潮',
}
const ratingText = computed(() => {
  const rt = props.r.steam?.rating
  if (!rt || !rt.totalReviews) return ''
  return RATING_ZH[rt.scoreDesc] || ''
})
const releaseYear = computed(() => {
  const m = String(props.r.steam?.releaseDate || '').match(/\d{4}/)
  return m ? m[0] : ''
})
const sizeText = computed(() => String(props.r.size || '').replace(/\s*(GB|MB)\s*/i, '$1').trim())

// 展示标题：去掉 Build 号/版本号等噪声；有英文名且标题里没有时拼在后面（中/EN 一行流）
const displayTitle = computed(() => {
  let t = String(props.r.title || '')
    .replace(/build\.?\s*\d+/gi, ' ')
    .replace(/ver\.?\s*[\d.]+/gi, ' ')
    .replace(/v\d+(\.\d+)+[a-z]?/gi, ' ') // v1.08、v1.5.3.0 这类带点版本号，标题中段也清掉
    .replace(/\s*v\d+[a-z]?\s*$/i, '')
    .replace(/(中文版|解压即玩|免安装版|免安装|硬盘版)\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const en = String(props.r.enTitle || '').trim()
  if (en && !t.toLowerCase().includes(en.toLowerCase().slice(0, 10))) t = `${t}/${en}`
  return t
})

// 「更新」角标：更新时间比上架晚 1 天以上、且在 45 天内
const isUpdated = computed(() => {
  const a = Date.parse(props.r.addedAt || '')
  const u = Date.parse(props.r.updatedAt || '')
  if (!a || !u) return false
  return u - a > 86400000 && Date.now() - u < 45 * 86400000
})

// 标签行：第一枚高亮（首个标签，没有就用分类），其后是 #分类 与其余标签，最多 3 枚
const chips = computed(() => {
  const tags = (props.r.tags || []).filter(Boolean)
  const list = []
  list.push(tags[0] || catLabel(props.r.category))
  list.push(catLabel(props.r.category))
  for (const t of tags.slice(1)) list.push(t)
  return [...new Set(list)].slice(0, 3)
})

// 底部：日期（M月D日，跨年带年份）+ 浏览量（数据里有 views 字段才显示）
const footDate = computed(() => {
  const iso = props.r.updatedAt || props.r.addedAt
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
    ? `${d.getMonth() + 1}月${d.getDate()}日`
    : `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})
const viewsText = computed(() => {
  const v = props.r.views
  if (v == null || v === '') return ''
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  return n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, '')}万` : String(n)
})
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
.rc__pills {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}
.rc__pill {
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  background: linear-gradient(135deg, #2ea6ff, #1a7fd4);
  border-radius: 100px;
  padding: 5px 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  white-space: nowrap;
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
.rc__body { padding: 14px; display: flex; flex-direction: column; gap: 9px; flex: 1; }
.rc__titlerow { display: flex; align-items: flex-start; gap: 7px; }
.rc__upd {
  flex: none;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  background: linear-gradient(135deg, #14b8a6, #0d9488);
  border-radius: 6px;
  padding: 4px 7px;
}
.rc__title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.rc__chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  overflow: hidden;
}
.rc__chip {
  flex: none;
  font-size: 11.5px;
  line-height: 1;
  color: var(--text-low, #9aa4b2);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 6px;
  padding: 5px 8px;
  white-space: nowrap;
}
.rc__chip--first {
  color: #7dd3fc;
  background: rgba(46, 166, 255, 0.12);
  border-color: rgba(46, 166, 255, 0.35);
  font-weight: 600;
}
.rc__foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 2px;
  font-size: 12px;
}
.rc__date { display: inline-flex; align-items: center; gap: 6px; }
.rc__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: 1.5px solid #f5c66b;
  flex: none;
}
.rc__views { margin-left: auto; }
</style>
