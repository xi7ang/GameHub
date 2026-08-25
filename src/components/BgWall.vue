<template>
  <div class="bg-wall" aria-hidden="true">
    <!-- Canvas 粒子星云层 -->
    <canvas ref="canvasRef" class="bg-wall__canvas"></canvas>

    <!-- 多层错向滚动封面墙 -->
    <div class="bg-wall__marquee">
      <div
        v-for="(row, ri) in marqueeRows"
        :key="ri"
        class="bg-wall__row"
        :class="ri % 2 === 0 ? 'scroll-left' : 'scroll-right'"
        :style="{ animationDuration: row.speed + 's' }"
      >
        <div v-for="(tile, ti) in row.tiles" :key="ti" class="bg-wall__tile">
          <div
            class="bg-wall__cover"
            :style="coverStyle(tile)"
          >
            <span class="bg-wall__tile-title">{{ tile.title }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 渐隐遮罩 -->
    <div class="bg-wall__fade"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useData } from '../composables/useData.js'

const { state } = useData()

const canvasRef = ref(null)
let ctx = null
let rafId = null
let particles = []
let stars = []
let mouseX = 0
let mouseY = 0

// ── 封面墙数据：取资源标题（无图时用渐变+标题），不足则用默认游戏名 ──
const FALLBACK = ['塞尔达传说', '黑神话悟空', '星露谷物语', '原神', '艾尔登法环', '空洞骑士', '死亡细胞', '双人成行', '我的世界', '泰拉瑞亚', '只狼', '战神', '最终幻想', '怪物猎人', '巫师3', '赛博朋克2077', '生化危机', '古墓丽影', '使命召唤', '暗黑破坏神']

const coverTitles = computed(() => {
  const titles = state.resources.map((r) => r.title).filter(Boolean)
  return titles.length >= 20 ? titles : [...titles, ...FALLBACK].slice(0, 40)
})

const marqueeRows = computed(() => {
  const t = coverTitles.value
  const count = Math.max(6, Math.ceil(t.length / 4))
  return [0, 1, 2].map((ri, idx) => {
    const tiles = []
    for (let i = 0; i < count; i++) {
      tiles.push({ title: t[(ri * 7 + i * 3 + idx * 5) % t.length] })
    }
    return { speed: 40 + ri * 18, tiles }
  })
})

// 确定性 hash → 霓虹渐变
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
function coverStyle(tile) {
  const [a, b] = GRADS[hashStr(tile.title) % GRADS.length]
  const deg = hashStr(tile.title + 'd') % 360
  return {
    background: `linear-gradient(${deg}deg, ${a}33, ${b}66)`,
    border: `1px solid ${a}55`,
    boxShadow: `0 0 24px ${a}22`,
  }
}

// ── Canvas 粒子星云 ──
function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = canvas.offsetWidth * devicePixelRatio
  canvas.height = canvas.offsetHeight * devicePixelRatio
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
}

function initParticles(w, h) {
  stars = Array.from({ length: 90 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 1.6 + 0.4,
    a: Math.random() * 0.7 + 0.2,
    tw: Math.random() * 0.02 + 0.005,
    ph: Math.random() * Math.PI * 2,
  }))
  particles = Array.from({ length: 26 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.25,
    vy: (Math.random() - 0.5) * 0.25,
    r: Math.random() * 2 + 0.8,
    hue: Math.random() * 60 + 260, // 紫-青范围
  }))
}

function draw(t) {
  const canvas = canvasRef.value
  if (!canvas) return
  const w = canvas.offsetWidth
  const h = canvas.offsetHeight
  ctx.clearRect(0, 0, w, h)

  // 星云光晕（跟随鼠标轻微偏移）
  const ox = mouseX * 14
  const oy = mouseY * 14
  const nebula = ctx.createRadialGradient(w / 2 + ox, h * 0.3 + oy, 0, w / 2 + ox, h * 0.3 + oy, Math.max(w, h) * 0.55)
  nebula.addColorStop(0, 'rgba(139, 92, 246, 0.10)')
  nebula.addColorStop(0.5, 'rgba(34, 211, 238, 0.04)')
  nebula.addColorStop(1, 'transparent')
  ctx.fillStyle = nebula
  ctx.fillRect(0, 0, w, h)

  // 星星（闪烁）
  stars.forEach((s) => {
    const a = s.a * (0.5 + 0.5 * Math.sin(t * s.tw + s.ph))
    ctx.beginPath()
    ctx.fillStyle = `rgba(200, 200, 255, ${a})`
    ctx.arc(s.x + mouseX * 6, s.y + mouseY * 6, s.r, 0, Math.PI * 2)
    ctx.fill()
  })

  // 漂浮粒子（连线成网）
  particles.forEach((p, i) => {
    p.x += p.vx
    p.y += p.vy
    if (p.x < 0) p.x = w
    if (p.x > w) p.x = 0
    if (p.y < 0) p.y = h
    if (p.y > h) p.y = 0
    ctx.beginPath()
    ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, 0.5)`
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
  })
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x
      const dy = particles[i].y - particles[j].y
      const d = Math.hypot(dx, dy)
      if (d < 130) {
        ctx.beginPath()
        ctx.strokeStyle = `hsla(265, 80%, 70%, ${0.16 * (1 - d / 130)})`
        ctx.lineWidth = 0.6
        ctx.moveTo(particles[i].x, particles[i].y)
        ctx.lineTo(particles[j].x, particles[j].y)
        ctx.stroke()
      }
    }
  }
  rafId = requestAnimationFrame(draw)
}

function onMouseMove(e) {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2
}

onMounted(() => {
  const canvas = canvasRef.value
  ctx = canvas.getContext('2d')
  resize()
  initParticles(canvas.offsetWidth, canvas.offsetHeight)
  window.addEventListener('resize', () => { resize(); initParticles(canvas.offsetWidth, canvas.offsetHeight) })
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  rafId = requestAnimationFrame(draw)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('resize', resize)
  window.removeEventListener('mousemove', onMouseMove)
})
</script>

<style scoped>
.bg-wall {
  position: fixed;
  inset: 0;
  z-index: -2;
  overflow: hidden;
  background: var(--bg-0);
}
.bg-wall__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.bg-wall__marquee {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  opacity: 0.5;
}
.bg-wall__row {
  display: flex;
  gap: 16px;
  width: max-content;
}
.scroll-left { animation: scrollLeft linear infinite; }
.scroll-right { animation: scrollRight linear infinite; }
@keyframes scrollLeft { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes scrollRight { from { transform: translateX(-50%); } to { transform: translateX(0); } }
.bg-wall__tile { flex-shrink: 0; }
.bg-wall__cover {
  width: 150px;
  height: 200px;
  border-radius: 10px;
  display: flex;
  align-items: flex-end;
  padding: 10px;
  backdrop-filter: blur(2px);
}
.bg-wall__tile-title {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.6);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.bg-wall__fade {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 90% 70% at 50% 0%, rgba(5, 5, 14, 0.25) 0%, var(--bg-0) 78%),
    linear-gradient(180deg, rgba(5, 5, 14, 0.6) 0%, rgba(5, 5, 14, 0.85) 45%, var(--bg-0) 100%);
}
</style>
