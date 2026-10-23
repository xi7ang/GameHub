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

        <div class="mv glass fade-up">
          <!-- 氛围底图 + 遮罩：v站详情页的沉浸式头部 -->
          <img v-if="r.cover" class="mv__backdrop" :src="r.cover" alt="" aria-hidden="true" />
          <div class="mv__veil" aria-hidden="true" />

          <div class="mv__body">
            <!-- 海报：3:4 版式；宽幅 Steam 封面用 contain + 自身模糊底，避免裁掉两侧 -->
            <div class="mv__poster" :style="coverStyle">
              <template v-if="r.cover">
                <img class="mv__poster-bg" :src="r.cover" alt="" aria-hidden="true" />
                <img class="mv__poster-img" :src="r.cover" :alt="r.title" />
              </template>
              <template v-else>
                <span class="detail__cover-halo" :style="haloStyle"></span>
                <span class="detail__cover-emoji">{{ cat?.emoji }}</span>
                <span class="detail__cover-title">{{ r.title }}</span>
              </template>
              <span v-if="r.status === 'inactive'" class="detail__inactive">⚠️ 链接已失效</span>
              <button
                type="button"
                class="mv__fav mv__fav--overlay"
                :class="{ 'is-on': favored }"
                :aria-pressed="favored"
                :aria-label="favored ? '取消收藏' : '收藏这个资源'"
                @click="onToggleFav"
              >{{ favored ? '★' : '☆' }}</button>
            </div>

            <div class="mv__col">
              <div class="mv__info">
                <div class="mv__badges flex gap-sm wrap">
                  <span class="badge" :style="catBadgeStyle">{{ cat?.emoji }} {{ cat?.name }}</span>
                  <span v-for="t in r.tags" :key="t" class="badge">#{{ t }}</span>
                  <span v-if="r.featured" class="badge" style="color: var(--neon-gold); border-color: rgba(251,191,36,0.4)">🔥 推荐</span>
                </div>

                <div class="mv__titlerow">
                  <h1 class="mv__title">{{ r.title }}</h1>
                  <button
                    type="button"
                    class="mv__fav mv__fav--pc"
                    :class="{ 'is-on': favored }"
                    :aria-pressed="favored"
                    @click="onToggleFav"
                  >
                    <span class="mv__fav-ico" aria-hidden="true">{{ favored ? '★' : '☆' }}</span>
                    <span class="mv__fav-txt">{{ favored ? '已收藏' : '收藏' }}</span>
                  </button>
                </div>

                <p v-if="r.enTitle" class="mv__en text-low">{{ r.enTitle }}</p>

                <div class="mv__meta text-low">
                  <span v-if="r.size">大小：{{ r.size }}</span>
                  <span>添加：{{ fmtFull(r.addedAt) }}</span>
                  <span>更新：{{ fmtFull(r.updatedAt) }}</span>
                </div>
              </div>

              <div class="mv__main">
                <div class="mv__get">
                  <div class="mv__get-head">
                    <span class="mv__get-title">获取资源</span>
                    <span class="mv__get-sub">{{ r.pwd ? '已自动带上提取码，点开即转存' : '无需提取码 · 直接打开' }}</span>
                  </div>
                  <div class="mv__cards">
                    <a :href="r.url" target="_blank" rel="noreferrer" class="mv-card" @click="onGet">
                      <div class="mv-card__ico" :style="platformIconStyle">
                        <img v-if="platform?.iconImg" class="mv-card__logo" :src="platform.iconImg" :alt="platform?.label || '网盘'" />
                        <span v-else>{{ platform?.icon }}</span>
                      </div>
                      <div class="mv-card__mid">
                        <div class="mv-card__name">{{ platform?.label || '网盘链接' }}</div>
                        <div v-if="getHints.length" class="mv-card__line">{{ getHints.join(' · ') }}</div>
                      </div>
                      <span class="mv-card__go">一键转存 →</span>
                    </a>
                  </div>
                </div>

                <p v-if="r.desc" class="mv__desc">{{ r.desc }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Steam 资料（可选区块：只有跑过 scripts/steam-import.mjs 的资源才有 r.steam，
             其余资源整段不渲染，页面与改造前一致。介绍/截图/配置放不进头部
             360px+信息列的双栏里，所以独立成全宽 section 放在获取卡片下面。） -->
        <template v-if="steam">
          <!-- 游戏资料：厂商/发行/评价/价格等事实信息 -->
          <section class="section steam-sec">
            <h2 class="section-title">🎮 游戏资料</h2>
            <div class="glass steam-card">
              <dl class="steam-facts">
                <div v-if="steam.developer"><dt>开发商</dt><dd>{{ steam.developer }}</dd></div>
                <div v-if="steam.publisher"><dt>发行商</dt><dd>{{ steam.publisher }}</dd></div>
                <div v-if="steam.releaseDate"><dt>发行日期</dt><dd>{{ steam.releaseDate }}</dd></div>
                <div v-if="steam.genres?.length"><dt>类型</dt><dd>{{ steam.genres.join(' · ') }}</dd></div>
                <div v-if="steam.rating">
                  <dt>Steam 评价</dt>
                  <dd>
                    <span class="steam-rate">{{ steam.rating.positiveRate }}% 好评</span>
                    <span class="text-low">（{{ fmtNum(steam.rating.totalReviews) }} 条评价）</span>
                  </dd>
                </div>
                <div v-if="steam.price">
                  <dt>Steam 价格</dt>
                  <dd>
                    <template v-if="steam.price.free">免费游玩</template>
                    <template v-else>
                      ¥{{ steam.price.final }}
                      <span v-if="steam.price.discountPercent" class="steam-off">-{{ steam.price.discountPercent }}%</span>
                    </template>
                  </dd>
                </div>
                <div v-if="steam.languages" class="steam-facts__wide"><dt>支持语言</dt><dd>{{ steam.languages }}</dd></div>
              </dl>
              <div class="steam-source text-low">
                <span>资料来源：Steam 商店</span>
                <a v-if="steam.storeUrl" :href="steam.storeUrl" target="_blank" rel="noreferrer">在 Steam 查看 →</a>
              </div>
            </div>
          </section>

          <!-- 游戏介绍：默认只展示前两段，长的点开看全文，避免详情页被长文撑爆 -->
          <section v-if="descParas.length" class="section steam-sec">
            <h2 class="section-title">📖 游戏介绍</h2>
            <div class="glass steam-card steam-desc">
              <p v-for="(p, i) in visibleDescParas" :key="i">{{ p }}</p>
              <button v-if="descNeedsExpand" type="button" class="steam-more" @click="descExpanded = !descExpanded">
                {{ descExpanded ? '收起 ↑' : '展开全部介绍 ↓' }}
              </button>
            </div>
          </section>

          <!-- 游戏截图：横向网格缩略图，点击看大图（灯箱可前后翻） -->
          <section v-if="steam.screenshots?.length" class="section steam-sec">
            <h2 class="section-title">🖼️ 游戏截图</h2>
            <div class="steam-shots">
              <button
                v-for="(u, i) in steam.screenshots"
                :key="u"
                type="button"
                class="steam-shot"
                @click="openShot(i)"
              >
                <img :src="u" :alt="`${r.title} 截图 ${i + 1}`" loading="lazy" />
              </button>
            </div>
          </section>

          <!-- 系统需求：最低 / 推荐 两列，移动端自动堆叠 -->
          <section v-if="steam.requirements?.minimum?.length || steam.requirements?.recommended?.length" class="section steam-sec">
            <h2 class="section-title">💻 系统需求</h2>
            <div class="glass steam-card steam-req">
              <div v-if="steam.requirements.minimum?.length">
                <h3>最低配置</h3>
                <ul><li v-for="(x, i) in steam.requirements.minimum" :key="i">{{ x }}</li></ul>
              </div>
              <div v-if="steam.requirements.recommended?.length">
                <h3>推荐配置</h3>
                <ul><li v-for="(x, i) in steam.requirements.recommended" :key="i">{{ x }}</li></ul>
              </div>
            </div>
          </section>
        </template>

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
        <a href="/" class="btn btn-primary mt-md">返回首页</a>
      </div>
    </div>

    <!-- 截图灯箱：点击截图打开，可前后翻页 -->
    <div v-if="shotIndex !== null && steam?.screenshots?.length" class="modal-mask" @click.self="shotIndex = null">
      <div class="shot-box">
        <button class="shot-box__close" @click="shotIndex = null" title="关闭">✕</button>
        <button class="shot-box__nav shot-box__nav--prev" @click="stepShot(-1)" title="上一张">‹</button>
        <img class="shot-box__img" :src="steam.screenshots[shotIndex]" :alt="`${r?.title} 截图`" />
        <button class="shot-box__nav shot-box__nav--next" @click="stepShot(1)" title="下一张">›</button>
        <div class="shot-box__count">{{ shotIndex + 1 }} / {{ steam.screenshots.length }}</div>
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
  <AnnouncementModal />
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import QRCode from 'qrcode'
import SiteHeader from '../components/SiteHeader.vue'
import BgWall from '../components/BgWall.vue'
import ResourceCard from '../components/ResourceCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import AnnouncementModal from '../components/AnnouncementModal.vue'
import { useData } from '../composables/useData.js'
import { useFavorites } from '../composables/useFavorites.js'
import { shortId } from '../lib/short.js'
import { BUILD_ID } from '../lib/version.js'

const BASE = import.meta.env.BASE_URL

const { state, loadDetail, catMeta } = useData()
const params = new URLSearchParams(location.search)

// <title>：资源名前 10 字 + 页面静态标题（后半句的品牌名由 useData.applyBrandToDoc 统一换成运行中品牌）。
// 详情页由 ?id= 定位，构建期不知道是哪条资源，只能加载后运行时改。
const TITLE_NAME_LEN = 10
let titleApplied = false
function applyDocTitle() {
  const item = r.value
  if (!item?.title || titleApplied) return
  // 第 10 个字符可能正好是空格（如「战D6 战D风云6 赠单板补丁」），不 trim 会拼出双空格
  const prefix = String(item.title).slice(0, TITLE_NAME_LEN).trim()
  document.title = `${prefix} ${document.title}`
  titleApplied = true
}
const rawId = params.get('id')
const legacyCat = params.get('c')
const showQr = ref(false)
const qrRef = ref(null)

// Umami 自建统计（script 由 postbuild 的 inject-build.js 注入全站，见那里第 7 条）。
// 事件名带资源 id：view:<id> / get:<id>，聚合侧 join 出「每资源点击率 = get / view」。
// 脚本被拦截或未加载时不能影响页面，所以判存在 + try 包住。
function track(name) {
  try {
    if (window.umami && typeof window.umami.track === 'function') window.umami.track(name)
  } catch (e) {
    /* 统计失败不能影响页面 */
  }
}

// 详情数据由 loadDetail 提供：优先单条详情文件（几 KB），失败时它内部回退全量加载，
// 两种路径都把当前资源写入 state.detail；短码/旧 id 的解析也在 loadDetail 里处理
const r = computed(() => state.detail || null)

// 旧站链接兼容：/resource?c=games&id=1329 → 查 legacy-map → 302 到新短链
async function resolveLegacy() {
  if (r.value || !legacyCat || !rawId || !/^\d+$/.test(rawId)) return
  try {
    const map = await fetch(`${BASE}data/legacy-map.json?v=${BUILD_ID || Date.now()}`).then((res) => res.json())
    const newId = map[`${legacyCat}:${rawId}`]
    if (newId) {
      location.replace(`/resource.html?id=${shortId(newId)}`)
    }
  } catch (e) {
    console.error('legacy 映射加载失败:', e)
  }
}

onMounted(async () => {
  await loadDetail(rawId)
  applyDocTitle() // 必须在 loadDetail() 之后：那时 applyBrandToDoc 已把静态标题里的品牌名换好
  if (r.value?.id) track('view:' + r.value.id)
  await resolveLegacy()
})

const cat = computed(() => (r.value ? catMeta(r.value.category) : null))

// ── Steam 资料（可选）：steam-import.mjs 写入的嵌套字段，没有就整段不渲染 ──
const steam = computed(() => r.value?.steam || null)

function fmtNum(n) {
  return typeof n === 'number' ? n.toLocaleString('en-US') : n
}

// 游戏介绍默认折叠：段落多或总长超阈值时只露前两段
const descExpanded = ref(false)
const descParas = computed(() =>
  steam.value?.description ? steam.value.description.split('\n').map((s) => s.trim()).filter(Boolean) : []
)
const descNeedsExpand = computed(
  () => descParas.value.length > 2 || (steam.value?.description || '').length > 420
)
const visibleDescParas = computed(() =>
  descNeedsExpand.value && !descExpanded.value ? descParas.value.slice(0, 2) : descParas.value
)

// 截图灯箱
const shotIndex = ref(null)
function openShot(i) {
  shotIndex.value = i
}
function stepShot(dir) {
  const list = steam.value?.screenshots || []
  if (!list.length || shotIndex.value === null) return
  shotIndex.value = (shotIndex.value + dir + list.length) % list.length
}

// 换资源时重置介绍折叠与灯箱，避免把上一条的状态带过来
watch(
  () => r.value?.id,
  () => {
    descExpanded.value = false
    shotIndex.value = null
  }
)

// 收藏 / 已收藏（纯本地 localStorage）
const { isFav, toggleFav } = useFavorites()
const favored = computed(() => isFav(r.value?.id))
function onToggleFav() {
  if (!r.value?.id) return
  toggleFav(r.value)
}
const platform = computed(() => {
  if (!r.value) return null
  const p = state.site?.platforms?.[r.value.platform]
  return p || { label: '网盘链接', icon: '🔗' }
})
const related = computed(() => {
  if (!r.value) return []
  // 相关推荐只需要卡片字段：优先用瘦索引（detailIndex），兜底全量时用 resources
  const pool = state.detailIndex || state.resources
  return pool.filter((x) => x.category === r.value.category && x.id !== r.value.id).slice(0, 4)
})

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
const platformIconStyle = computed(() => {
  // 带位图 logo 的网盘（如夸克）用白底：源图是透明底浅色 logo，压在暗色卡上几乎看不见
  if (platform.value?.iconImg) return { background: '#fff' }
  const c = platform.value?.color || '#888'
  return { background: c + '1a' }
})

// 「获取方式」下面的决策理由：只用站上真实存在的字段，不编「已获取 1234 次」这种假社会证明
const getHints = computed(() => {
  const item = r.value
  if (!item) return []
  const out = []
  if (item.status !== 'inactive') out.push('✅ 免费分享')
  if (item.size) out.push(`📦 ${item.size}`)
  const d = daysAgo(item.updatedAt)
  if (d !== null) out.push(d <= 0 ? '🕒 今日更新' : `🕒 ${d} 天前更新`)
  return out
})
function daysAgo(iso) {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.floor((Date.now() - t) / 86400000))
}
// 移动端点了之后按钮换兜底文案：目标页被拦截/加载慢时用户能再点一次，这是真实的流失点
const gotIt = ref(false)

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
  // 先埋点再分流：两条路径（弹码 / 直接跳）都算一次「获取」
  if (r.value?.id) track('get:' + r.value.id)
  if (window.matchMedia('(min-width: 768px)').matches) {
    e.preventDefault()
    showQr.value = true
    return
  }
  // 移动端直接跳网盘；这里不动 preventDefault，让默认导航照常发生
  gotIt.value = true
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
  // 注意：qrcode 库颜色只支持 hex（含 #RRGGBBAA），不支持 rgba() 字符串
  await QRCode.toCanvas(tmp, text, {
    width: size,
    margin: 2,
    color: { dark: '#000000ff', light: '#ffffff00' },
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

</script>

<style scoped>
.resource-page { min-height: 100vh; }
.back-link { display: inline-block; margin: 26px 0 14px; font-size: 14px; transition: color 0.2s; position: relative; z-index: 1; }
.back-link:hover { color: var(--neon-cyan); }


/* ── 详情页卡片（版式参照 v 站）：虚化氛围底 + 3:4 海报 + 信息列 + 网盘卡 ── */
.mv {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-lg);
  z-index: 1;
}
.mv__backdrop {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; filter: blur(30px) saturate(1.2);
  transform: scale(1.25); opacity: 0.35; pointer-events: none;
}
.mv__veil {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(180deg, rgba(var(--bg-0-rgb), 0.72), rgba(var(--bg-0-rgb), 0.96));
}
.mv__body {
  position: relative;
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 28px;
  padding: 26px 28px;
}
.mv__poster {
  position: relative;
  aspect-ratio: 3 / 4;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  background: var(--bg-2);
  display: flex; align-items: center; justify-content: center;
}
.mv__poster-bg {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; filter: blur(18px) brightness(0.55) saturate(1.2);
  transform: scale(1.15); pointer-events: none;
}
.mv__poster-img {
  position: relative; z-index: 1;
  width: 100%; height: 100%;
  object-fit: contain; box-sizing: border-box; padding: 8px;
}
.mv__col { min-width: 0; }
.mv__info { min-width: 0; }
.mv__badges { margin-bottom: 16px; }
.mv__titlerow { margin-bottom: 10px; }
.mv__title {
  display: inline;
  font-family: var(--font-display);
  font-size: 30px; font-weight: 700; line-height: 1.25;
  margin: 0;
}
.mv__en { font-size: 15px; margin: 6px 0 0; }
.mv__meta {
  display: flex; gap: 16px; flex-wrap: wrap;
  font-size: 12.5px; margin-top: 14px;
  border-top: 1px solid var(--glass-border); padding-top: 12px;
}
.mv__fav {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 15px; border-radius: 100px;
  border: 1px solid var(--glass-border);
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--text-mid);
  font-size: 13px; font-weight: 700;
  cursor: pointer; white-space: nowrap;
  transition: all 0.2s;
}
.mv__fav:hover { border-color: var(--accent-gold); color: var(--accent-gold); }
.mv__fav.is-on {
  border-color: var(--accent-gold); color: var(--accent-gold);
  background: rgba(var(--accent-rgb), 0.16);
}
.mv__fav--pc { margin-left: 12px; vertical-align: middle; }
.mv__fav--overlay {
  position: absolute; top: 8px; right: 8px; z-index: 3;
  display: none; padding: 6px 9px; font-size: 16px; line-height: 1;
  background: rgba(0, 0, 0, 0.42);
  border-color: rgba(255, 255, 255, 0.22);
  color: #fff;
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
}
.mv__main { margin-top: 18px; }
.mv__get {
  background: rgba(127, 127, 127, 0.06);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  padding: 16px 18px;
}
.mv__get-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.mv__get-title { font-family: var(--font-display); font-size: 16px; font-weight: 700; }
.mv__get-sub { font-size: 12.5px; color: var(--text-low); }
.mv__cards { display: grid; gap: 10px; }
.mv-card {
  display: flex; align-items: center; gap: 14px;
  background: rgba(127, 127, 127, 0.05);
  border: 1px solid var(--glass-border);
  border-radius: 12px; padding: 12px 14px;
  text-decoration: none; color: inherit;
  transition: all 0.2s;
}
.mv-card:hover { border-color: var(--accent-gold); box-shadow: var(--shadow-glow); transform: translateY(-1px); }
.mv-card__ico {
  display: grid; place-items: center;
  width: 44px; height: 44px; border-radius: 12px;
  border: 1px solid var(--glass-border);
  font-size: 19px; flex: 0 0 auto; overflow: hidden;
}
.mv-card__logo { width: 100%; height: 100%; object-fit: cover; display: block; }
.mv-card__mid { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.mv-card__name { font-size: 15px; font-weight: 700; }
.mv-card__line { font-size: 12px; color: var(--text-mid); }
.mv-card__go {
  flex: 0 0 auto;
  background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-deep));
  color: #fff; font-weight: 700; font-size: 13.5px;
  padding: 9px 16px; border-radius: 100px; white-space: nowrap;
}
.mv__desc {
  color: var(--text-mid); font-size: 14.5px; line-height: 1.85;
  margin-top: 16px; white-space: pre-wrap;
}
@media (max-width: 768px) {
  .mv__body { grid-template-columns: 220px 1fr; gap: 18px; padding: 18px; }
  .mv__title { font-size: 24px; }
}
@media (max-width: 640px) {
  .mv { margin-bottom: var(--space-md); }
  .mv__body { grid-template-columns: 118px minmax(0, 1fr); gap: 12px; padding: 12px 14px; }
  .mv__poster { grid-column: 1; grid-row: 1; }
  .mv__col { display: contents; }
  .mv__info { grid-column: 2; grid-row: 1; min-width: 0; }
  .mv__main { grid-column: 1 / -1; grid-row: 2; margin-top: 12px; }
  .mv__badges { margin-bottom: 9px; }
  .mv__badges .badge { font-size: 10.5px; padding: 2px 7px; }
  .mv__titlerow { margin-bottom: 6px; }
  .mv__fav--pc { display: none; }
  .mv__fav--overlay { display: inline-flex; }
  .mv__title { font-size: 16px; line-height: 1.28; margin-bottom: 6px; }
  .mv__en { font-size: 12px; margin-top: 4px; }
  .mv__meta { font-size: 11px; margin-top: 8px; gap: 10px; padding-top: 8px; }
  .mv__desc {
    font-size: 11.5px; line-height: 1.5; margin-top: 9px;
    display: -webkit-box; -webkit-line-clamp: 3;
    -webkit-box-orient: vertical; overflow: hidden;
  }
  .mv__get { padding: 10px 11px; }
  .mv__get-head { gap: 6px; margin-bottom: 8px; }
  .mv__get-title { font-size: 13px; }
  .mv__get-sub { font-size: 10.5px; }
  .mv__cards { gap: 8px; }
  .mv-card { gap: 9px; padding: 8px 10px; border-radius: 10px; }
  .mv-card__ico { width: 30px; height: 30px; font-size: 14px; border-radius: 9px; }
  .mv-card__name { font-size: 12.5px; }
  .mv-card__line { font-size: 10.5px; }
  .mv-card__go { font-size: 11px; padding: 6px 11px; }
}

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
.detail__cover-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(20px) brightness(0.62) saturate(1.2);
  transform: scale(1.12);
  pointer-events: none;
}
.detail__cover-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  box-sizing: border-box;
  padding: 6px;
}
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

/* 收藏按钮（本地功能，视觉语言与全站 CTA 区分：已收藏用暖金实底） */
.detail__actions { display: flex; gap: 10px; margin-bottom: 4px; }
.fav-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  border-radius: 100px;
  border: 1px solid var(--glass-border);
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--text-mid);
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}
.fav-btn:hover { color: var(--text-hi); border-color: var(--accent-gold); box-shadow: var(--shadow-glow); }
.fav-btn__star { font-size: 16px; line-height: 1; }
.fav-btn--on {
  color: #3b1e00;
  border-color: transparent;
  background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-deep));
  box-shadow: 0 4px 18px rgba(var(--accent-rgb), 0.35);
}
.fav-btn--on:hover { color: #3b1e00; }

/* 获取卡片：平台 + 提取码 + 一键获取 整合高亮 */
.get-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 16px 0 20px;
  padding: 18px;
  border-radius: 16px;
  /* 无边框：柔和渐变底替代框线 */
  background: linear-gradient(160deg, rgba(var(--accent-rgb), 0.09), rgba(var(--accent-rgb), 0.02) 55%, transparent);
}

/* 图标卡 = 可点引导区：整块跟按钮同 href，视线第一站就是可操作的 */
.platform-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px;
  margin: -4px;
  border-radius: 12px;
  transition: background 0.25s ease;
}
.platform-card:hover { background: rgba(var(--accent-rgb), 0.07); }
.platform-card:active { background: rgba(var(--accent-rgb), 0.12); }
.platform-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 44px;
  height: 44px;
  border-radius: 12px;
  font-size: 24px;
}
.platform-card__icon-img {
  width: 30px;
  height: 30px;
  object-fit: contain;
}
.platform-card__body { flex: 1; min-width: 0; }
.platform-card__name { font-weight: 700; font-size: 15px; }
.platform-card__desc { font-size: 13px; margin-top: 2px; }
/* 决策理由：真实字段拼的，不编社会证明 */
.get-hints { display: flex; flex-wrap: wrap; gap: 2px 10px; margin-top: 4px; }
.get-hint { font-size: 12px; color: var(--text-low); white-space: nowrap; }

/* 「获取方式」：暖色渐变字 + 上升火星粒子 */
.hot-label { position: relative; display: inline-block; }
.hot-label__text {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.5px;
  background: linear-gradient(180deg, #ffedb0 0%, #ffb347 46%, #ff5a15 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 6px rgba(255, 122, 26, 0.35));
}
.hot-label__embers { position: absolute; inset: 0; pointer-events: none; }
.hot-label__embers i {
  position: absolute;
  bottom: 1px;
  left: calc(4% + var(--i) * 15%);
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff6c2 0%, #ffab2e 45%, #ff4d00 78%, transparent 100%);
  opacity: 0;
  /* 只跑一次：进页时的入场火星，不常驻循环（循环动画看三遍就是噪音） */
  animation: ember-rise 2.4s ease-out 0.2s 1 both;
  animation-delay: calc(0.2s + var(--i) * 0.4s);
}
@keyframes ember-rise {
  0% { translate: 0 0; scale: 0.5; opacity: 0; }
  25% { opacity: 1; }
  70% { opacity: 0.65; }
  100% { translate: 0 -22px; scale: 0.2; opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .hot-label__embers { display: none; }
}

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
.detail__btn {
  position: relative;
  overflow: hidden;
  font-size: 17px;
  font-weight: 800;
  padding: 15px 28px;
  border-radius: 16px;
  justify-content: center;
  width: 100%;
  /* 全站唯一用橙色的地方：跟粒子同一语义（火 = 值得拿），从金色 CTA 里跳出来 */
  color: #3b1e00;
  background: linear-gradient(165deg, #ffd45c 0%, #ff9f22 52%, #ff6a00 100%);
  box-shadow: 0 6px 26px rgba(255, 122, 26, 0.38);
  animation: cta-in 0.55s cubic-bezier(0.2, 0.8, 0.3, 1) both;
}
.detail__btn:hover { box-shadow: 0 8px 34px rgba(255, 122, 26, 0.55); transform: translateY(-1px); }
.detail__btn:active { transform: scale(0.97); }
/* 进页一次的扫光：跑完停住，不循环；动 transform 的伪元素跟 :hover/:active 的 transform 不撞车 */
.detail__btn::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 45%;
  background: linear-gradient(105deg, transparent, rgba(255, 255, 255, 0.8), transparent);
  transform: translateX(-160%);
  animation: cta-sweep 1.2s ease-out 0.35s 1 both;
  pointer-events: none;
}
/* 入场缩放动的是 scale 而不是 transform：transform 会永久盖住 :hover/:active 的位移与缩放 */
@keyframes cta-in {
  from { scale: 0.92; opacity: 0.5; }
  to { scale: 1; opacity: 1; }
}
@keyframes cta-sweep {
  from { transform: translateX(-160%); }
  to { transform: translateX(320%); }
}
.detail__btn-label { position: relative; z-index: 1; }

/* 「一键免费获取」：按钮内上升的 SVG 四角星粒子 */
.btn-sparks { position: absolute; inset: 0; pointer-events: none; }
.btn-spark {
  position: absolute;
  bottom: 3px;
  left: calc(4% + (var(--i) - 1) * 18%);
  color: #ffffff;
  filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.7));
  opacity: 0;
  animation: spark-rise 2.6s ease-out infinite;
  animation-delay: calc(var(--i) * 0.42s);
}
@keyframes spark-rise {
  0% { translate: 0 6px; scale: 0.4; opacity: 0; }
  18% { opacity: 1; }
  60% { opacity: 0.8; }
  100% { translate: 0 -30px; scale: 0.15; opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .hot-label__embers,
  .btn-sparks { display: none; }
  .detail__btn,
  .detail__btn::after { animation: none; }
}
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

/* ── Steam 资料区块（全宽 section，承接放不进头部双栏的长内容） ── */
.steam-sec { padding-bottom: 0; }
.steam-card { padding: 22px 24px; position: relative; z-index: 1; }
/* 长内容卡片不需要 glass 的 hover 上浮，读长文时晃动是干扰 */
.steam-card:hover { transform: none; }
.steam-facts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 28px;
  margin: 0;
}
.steam-facts > div { display: flex; gap: 10px; font-size: 14px; min-width: 0; }
.steam-facts dt { flex: 0 0 72px; color: var(--text-low); }
.steam-facts dd { margin: 0; color: var(--text-mid); overflow-wrap: anywhere; }
.steam-facts__wide { grid-column: 1 / -1; }
.steam-rate { color: var(--neon-cyan); font-weight: 700; }
.steam-off {
  color: #4ade80;
  font-weight: 700;
  margin-left: 6px;
}
.steam-source {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 12px;
  margin-top: 16px;
  border-top: 1px solid var(--glass-border);
  padding-top: 12px;
}
.steam-source a { color: var(--neon-cyan); }

.steam-desc p {
  font-size: 15px;
  line-height: 1.9;
  color: var(--text-mid);
  margin: 0 0 12px;
}
.steam-desc p:last-of-type { margin-bottom: 0; }
.steam-more {
  margin-top: 12px;
  padding: 8px 18px;
  border-radius: 100px;
  border: 1px solid var(--glass-border);
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--text-mid);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.steam-more:hover { color: var(--text-hi); border-color: var(--neon-cyan); }

.steam-shots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  position: relative;
  z-index: 1;
}
.steam-shot {
  padding: 0;
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  overflow: hidden;
  background: none;
  cursor: zoom-in;
  aspect-ratio: 16 / 9;
  transition: border-color 0.2s, transform 0.2s;
}
.steam-shot:hover { border-color: var(--neon-cyan); transform: translateY(-2px); }
.steam-shot img { width: 100%; height: 100%; object-fit: cover; display: block; }

.steam-req { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 32px; }
.steam-req h3 { font-size: 15px; margin: 0 0 10px; }
.steam-req ul { margin: 0; padding-left: 18px; font-size: 13.5px; line-height: 1.9; color: var(--text-mid); }

/* 截图灯箱 */
.shot-box { position: relative; max-width: 1000px; width: 94%; }
.shot-box__img {
  width: 100%;
  max-height: 82vh;
  object-fit: contain;
  border-radius: 12px;
  background: #000;
  display: block;
}
.shot-box__close {
  position: absolute;
  top: -14px;
  right: -14px;
  z-index: 2;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(10, 10, 24, 0.9);
  color: #fff;
  cursor: pointer;
}
.shot-box__nav {
  position: absolute;
  top: 50%;
  translate: 0 -50%;
  z-index: 2;
  width: 42px;
  height: 56px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(10, 10, 24, 0.65);
  color: #fff;
  font-size: 30px;
  line-height: 1;
  cursor: pointer;
  border-radius: 10px;
}
.shot-box__nav--prev { left: 10px; }
.shot-box__nav--next { right: 10px; }
.shot-box__count {
  position: absolute;
  bottom: 10px;
  right: 14px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(0, 0, 0, 0.55);
  padding: 3px 10px;
  border-radius: 100px;
}

@media (max-width: 768px) {
  .steam-facts { grid-template-columns: 1fr; }
  .steam-req { grid-template-columns: 1fr; }
  .steam-shots { grid-template-columns: repeat(2, 1fr); }
  .steam-card { padding: 18px; }
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
  .rc-grid { grid-template-columns: repeat(2, 1fr); padding: 0 8px; }
}
@media (max-width: 480px) { .rc-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
