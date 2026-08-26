<template>
  <div class="resource-page">
    <SiteHeader />
    <BgWall />

    <div class="container">
      <div v-if="state.loading" class="detail-loading">
        <div class="skeleton" style="height: 320px; border-radius: var(--radius-lg)"></div>
      </div>

      <template v-else-if="r">
        <a href="javascript:history.back()" class="back-link text-low">← 返回</a>

        <div class="detail glass fade-up">
          <!-- 封面：小尺寸配图（移动端 ≤50vw，PC 端 ≤1/2 宽） -->
          <div class="detail__cover" :style="coverStyle">
            <img v-if="r.cover" :src="r.cover" :alt="r.title" />
            <template v-else>
              <span class="detail__cover-halo" :style="haloStyle"></span>
              <span class="detail__cover-emoji">{{ cat?.emoji }}</span>
              <span class="detail__cover-title">{{ r.title }}</span>
            </template>
            <span v-if="r.status === 'inactive'" class="detail__inactive">⚠️ 链接已失效</span>
          </div>

          <!-- 信息区：获取优先 -->
          <div class="detail__info">
            <div class="flex gap-sm wrap mb-md">
              <span class="badge" :style="catBadgeStyle">{{ cat?.emoji }} {{ cat?.name }}</span>
              <span v-for="t in r.tags" :key="t" class="badge">#{{ t }}</span>
              <span v-if="r.featured" class="badge" style="color: var(--neon-gold); border-color: rgba(251,191,36,0.4)">🔥 推荐</span>
            </div>

            <h1 class="detail__title">{{ r.title }}</h1>
            <p v-if="r.enTitle" class="detail__entitle text-low">{{ r.enTitle }}</p>

            <!-- 获取卡片：平台 + 提取码 + 一键获取 -->
            <div class="get-card">
              <div class="platform-card" :style="platformCardStyle">
                <div class="platform-card__icon">{{ platform?.icon }}</div>
                <div class="platform-card__body">
                  <div class="platform-card__name">{{ platform?.label }}</div>
                  <div v-if="platform?.desc" class="platform-card__desc text-low">{{ platform.desc }}</div>
                </div>
              </div>

              <div v-if="r.pwd" class="pwd-row">
                <span class="text-low">提取码：</span>
                <code class="pwd-code">{{ r.pwd }}</code>
                <button class="btn btn-sm" @click="copyPwd">📋 复制</button>
              </div>

              <a :href="r.url" target="_blank" rel="noreferrer" class="btn btn-primary detail__btn" @click="onGet">🔑 一键获取</a>
            </div>

            <!-- 描述 + 元信息（沉底） -->
            <p v-if="r.desc" class="detail__desc">{{ r.desc }}</p>
            <div class="detail__meta text-low">
              <span v-if="r.size">大小：{{ r.size }}</span>
              <span>添加：{{ fmtFull(r.addedAt) }}</span>
              <span>更新：{{ fmtFull(r.updatedAt) }}</span>
            </div>
          </div>
        </div>

        <!-- 同分类推荐 -->
        <section v-if="related.length" class="section">
          <h2 class="section-title">🎯 同类推荐</h2>
          <div class="rc-grid">
            <ResourceCard v-for="rel in related" :key="rel.id" :r="rel" />
          </div>
        </section>
      </template>

      <div v-else class="empty glass">
        <div style="font-size: 40px; margin-bottom: 10px">🕹️</div>
        <p>资源不存在或已被移除</p>
        <a href="/GameHub/" class="btn btn-primary mt-md">返回首页</a>
      </div>
    </div>

    <!-- 二维码弹窗（PC 端「一键获取」触发，qrcode 渐变游戏风二维码） -->
    <div v-if="showQr" class="modal-mask" @click.self="showQr = false">
      <div class="modal glass game-modal">
        <button class="game-modal__close" @click="showQr = false" title="关闭">✕</button>
        <h3 class="game-modal__title">🎮 扫码获取资源</h3>
        <p class="game-modal__hint">手机扫一扫，资源立即到手</p>
        <div class="game-modal__qr-wrap">
          <canvas ref="qrRef" class="game-modal__qr"></canvas>
        </div>
        <div v-if="r?.pwd" class="game-modal__pwd">
          <span class="text-low">提取码：</span>
          <code class="pwd-code">{{ r.pwd }}</code>
        </div>
        <p class="game-modal__tip">⚡ 扫一扫，资源到手 🎮</p>
      </div>
    </div>

    <SiteFooter />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import QRCode from 'qrcode'
import SiteHeader from '../components/SiteHeader.vue'
import BgWall from '../components/BgWall.vue'
import ResourceCard from '../components/ResourceCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { useData } from '../composables/useData.js'

const { state, load, catMeta } = useData()
const params = new URLSearchParams(location.search)
const id = params.get('id')
const showQr = ref(false)
const qrRef = ref(null)

const r = computed(() => state.resources.find((x) => x.id === id))
const cat = computed(() => (r.value ? catMeta(r.value.category) : null))
const platform = computed(() => {
  if (!r.value) return null
  const p = state.site?.platforms?.[r.value.platform]
  return p || { label: '网盘链接', icon: '🔗' }
})
const related = computed(() =>
  r.value ? state.resources.filter((x) => x.category === r.value.category && x.id !== r.value.id).slice(0, 4) : []
)

function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
const coverStyle = computed(() => {
  if (!r.value || r.value.cover) return {}
  const [a, b] = cat.value?.gradient || ['#c99a5b', '#a87b3f']
  const deg = hashStr(r.value.title + 'c') % 360
  return { background: `linear-gradient(${deg}deg, ${a} 0%, ${b} 100%)` }
})
const haloStyle = computed(() => {
  if (!r.value || r.value.cover) return {}
  const [a] = cat.value?.gradient || ['#c99a5b', '#a87b3f']
  return { background: `radial-gradient(circle at 50% 38%, ${a}55 0%, transparent 70%)` }
})
const catBadgeStyle = computed(() => {
  if (!cat.value) return {}
  return {
    color: cat.value.gradient[0],
    borderColor: cat.value.gradient[0] + '55',
    background: cat.value.gradient[0] + '14',
  }
})
const platformCardStyle = computed(() => {
  const c = platform.value?.color || '#888'
  return {
    border: `1px solid ${c}44`,
    background: `${c}0d`,
  }
})

function fmtFull(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
async function copyPwd() {
  try {
    await navigator.clipboard.writeText(r.value.pwd)
    alert('提取码已复制: ' + r.value.pwd)
  } catch {
    alert('提取码: ' + r.value.pwd)
  }
}
// 「一键获取」设备分流：PC 弹二维码，移动端直接跳转网盘
function onGet(e) {
  if (window.matchMedia('(min-width: 768px)').matches) {
    e.preventDefault()
    showQr.value = true
  }
}

// 渐变游戏风二维码：深色模块替换为紫→蓝→青渐变
function lerp(a, b, t) {
  return Math.round(a + (b - a) * t)
}
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const QR_GRAD = ['#7c3aed', '#4f46e5', '#0891b2'] // 紫→靛蓝→深青
async function drawGradientQr(canvas, text) {
  const size = 240
  const tmp = document.createElement('canvas')
  tmp.width = tmp.height = size
  // 1. 生成基础二维码：深色模块不透明，浅色区域透明
  await QRCode.toCanvas(tmp, text, {
    width: size,
    margin: 2,
    color: { dark: '#000000', light: 'rgba(255,255,255,0)' },
  })
  // 2. 目标画布：白底 + 渐变填充
  const ctx = canvas.getContext('2d')
  canvas.width = canvas.height = size
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  const stops = QR_GRAD.map(hexToRgb)
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1)
    const seg = t * (stops.length - 1)
    const i = Math.min(Math.floor(seg), stops.length - 2)
    const f = seg - i
    const [r1, g1, b1] = stops[i]
    const [r2, g2, b2] = stops[i + 1]
    const r = lerp(r1, r2, f)
    const g = lerp(g1, g2, f)
    const b = lerp(b1, b2, f)
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fillRect(0, y, size, 1)
  }
  // 3. 用二维码深色模块作遮罩，只保留渐变
  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(tmp, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
}

watch(showQr, async (v) => {
  if (!v || !r.value) return
  await nextTick() // 先等 v-if 弹窗挂载完成，再拿 canvas
  if (!qrRef.value) return
  try {
    await drawGradientQr(qrRef.value, r.value.url)
  } catch (e) {
    console.error('二维码生成失败:', e)
  }
})

onMounted(load)</script>

<style scoped>
.resource-page { min-height: 100vh; }
.back-link { display: inline-block; margin: 26px 0 14px; font-size: 14px; transition: color 0.2s; position: relative; z-index: 1; }
.back-link:hover { color: var(--neon-cyan); }

.detail {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 0;
  overflow: hidden;
  position: relative;
  z-index: 1;
}
.detail__cover {
  position: relative;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  overflow: hidden;
}
.detail__cover img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.detail__cover-halo {
  position: absolute;
  inset: -20%;
  z-index: 1;
  pointer-events: none;
}
.detail__cover-emoji {
  position: relative;
  z-index: 2;
  font-size: 38px;
  filter: drop-shadow(0 4px 14px rgba(0, 0, 0, 0.45));
}
.detail__cover-title {
  position: relative;
  z-index: 2;
  font-family: var(--font-display);
  font-size: clamp(18px, 2.2vw, 26px);
  font-weight: 700;
  color: #fff;
  text-align: center;
  text-shadow: 0 3px 16px rgba(0, 0, 0, 0.8), 0 0 32px rgba(255, 255, 255, 0.3);
  line-height: 1.3;
  max-width: 90%;
}
.detail__inactive {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 5, 14, 0.8);
  color: #fb7185;
  font-weight: 700;
  font-size: 18px;
}
.detail__info { padding: 28px 30px; display: flex; flex-direction: column; }
.detail__title { font-size: 26px; font-weight: 700; margin-bottom: 6px; }
.detail__entitle { font-size: 15px; margin-bottom: 12px; }

/* 获取卡片：平台 + 提取码 + 一键获取 整合高亮 */
.get-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 16px 0 20px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  background: rgba(var(--accent-rgb), 0.05);
}

.platform-card {
  display: flex;
  align-items: center;
  gap: 14px;
}
.platform-card__icon { font-size: 28px; }
.platform-card__name { font-weight: 700; font-size: 15px; }
.platform-card__desc { font-size: 13px; margin-top: 2px; }

.pwd-row { display: flex; align-items: center; gap: 10px; }
.pwd-code {
  padding: 6px 14px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.12);
  border: 1px dashed rgba(var(--accent-rgb), 0.4);
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--neon-cyan);
}
.detail__btn { font-size: 16px; padding: 13px 28px; justify-content: center; }
.detail__desc { font-size: 15px; color: var(--text-mid); margin-bottom: 20px; }
.detail__meta { display: flex; gap: 18px; flex-wrap: wrap; font-size: 13px; margin-top: auto; border-top: 1px solid var(--glass-border); padding-top: 16px; }

.rc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.empty { padding: 60px 20px; text-align: center; margin: 40px 0; }

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(3, 3, 10, 0.82);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal { padding: 30px; text-align: center; max-width: 340px; width: 90%; }
.modal__title { margin-bottom: 10px; }
.modal__hint { font-size: 13px; margin-bottom: 16px; }
.modal__iframe {
  width: 100%;
  height: 380px;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}
.modal__iframe iframe { width: 100%; height: 100%; border: 0; display: block; }
.modal__pwd { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 4px; }

/* 游戏风弹窗：霓虹渐变边框 + 渐变二维码 */
.game-modal {
  position: relative;
  max-width: 400px;
  width: 92%;
  padding: 32px 28px 26px;
  border-radius: 20px;
  border: 1.5px solid transparent;
  background:
    linear-gradient(rgba(10, 10, 24, 0.97), rgba(10, 10, 24, 0.97)) padding-box,
    linear-gradient(135deg, rgba(168, 85, 247, 0.7), rgba(34, 211, 238, 0.7), rgba(244, 114, 182, 0.6)) border-box;
  box-shadow: 0 0 50px rgba(124, 58, 237, 0.25), 0 0 80px rgba(34, 211, 238, 0.12);
  animation: gameModalIn 0.28s ease-out;
}
@keyframes gameModalIn {
  from { transform: scale(0.92); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.game-modal__close {
  position: absolute;
  top: 12px;
  right: 14px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-mid);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 5;
}
.game-modal__close:hover { color: var(--neon-cyan); border-color: var(--neon-cyan); box-shadow: 0 0 12px rgba(34, 211, 238, 0.4); }
.game-modal__title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 6px;
  background: linear-gradient(135deg, #a78bfa, #22d3ee, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 16px rgba(168, 85, 247, 0.35));
}
.game-modal__hint { font-size: 13px; color: var(--text-mid); margin-bottom: 16px; }
.game-modal__qr-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 14px;
}
.game-modal__qr {
  width: 240px;
  height: 240px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 0 24px rgba(34, 211, 238, 0.25), 0 4px 20px rgba(0, 0, 0, 0.4);
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.game-modal__pwd { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px; }
.game-modal__tip {
  font-size: 13px;
  color: var(--text-mid);
  letter-spacing: 0.05em;
  animation: tipPulse 2s ease-in-out infinite;
}
@keyframes tipPulse {
  0%, 100% { opacity: 0.85; }
  50% { opacity: 1; text-shadow: 0 0 14px rgba(34, 211, 238, 0.6); }
}

@media (max-width: 768px) {
  .detail { grid-template-columns: 1fr; }
  /* 移动端封面：显式宽度 70vw（grid item 收缩到内容宽度是之前封面变小的根因） */
  .detail__cover {
    width: min(70vw, 100%);
    min-height: 0;
    aspect-ratio: 16 / 9;
    justify-self: center;
    margin-top: 20px;
    border-radius: 12px;
  }
  .detail__cover-emoji { font-size: 26px; }
  .detail__cover-title { font-size: 14px; }
  .detail__info { padding: 20px 18px 26px; }
  .detail__title { font-size: 22px; }
  .get-card { padding: 14px; }
  .detail__btn { width: 100%; }
  .rc-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) { .rc-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
