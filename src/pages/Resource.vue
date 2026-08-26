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

    <!-- 二维码弹窗（PC 端「一键获取」触发） -->
    <div v-if="showQr" class="modal-mask" @click.self="showQr = false">
      <div class="modal glass">
        <h3 class="modal__title">📱 扫码获取资源</h3>
        <p class="text-low modal__hint">请使用手机扫码获取资源</p>
        <div class="modal__qr" ref="qrRef"></div>
        <div v-if="r?.pwd" class="modal__pwd">
          <span class="text-low">提取码：</span>
          <code class="pwd-code">{{ r.pwd }}</code>
        </div>
        <button class="btn btn-sm mt-md" @click="showQr = false">关闭</button>
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

watch(showQr, async (v) => {
  if (!v || !r.value) return
  await nextTick() // 先等 v-if 弹窗挂载完成，再拿 qrRef
  if (!qrRef.value) return
  QRCode.toCanvas(qrRef.value, r.value.url, { width: 220, margin: 1, color: { dark: '#0a0a1a', light: '#ffffff' } })
})

onMounted(load)
</script>

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
  z-index: 200;
  background: rgba(5, 5, 14, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal { padding: 30px; text-align: center; max-width: 340px; width: 90%; }
.modal__title { margin-bottom: 10px; }
.modal__hint { font-size: 13px; margin-bottom: 16px; }
.modal__qr { display: flex; justify-content: center; margin-bottom: 12px; }
.modal__qr canvas { border-radius: 10px; background: #fff; }
.modal__pwd { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 4px; }

@media (max-width: 768px) {
  .detail { grid-template-columns: 1fr; }
  /* 移动端封面：适中大小，比例协调（70vw × 16:9） */
  .detail__cover {
    max-width: 70vw;
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
