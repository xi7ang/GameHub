<template>
  <div class="home">
    <SiteHeader />
    <BgWall />

    <!-- Hero -->
    <section class="hero">
      <div class="container hero__inner">
        <h1 class="hero__title">发现全网<br /><em>优质游戏资源</em></h1>
        <p class="hero__subtitle">{{ site?.slogan }} · 单机 / 手游 / Switch / MOD 一站式聚合</p>
        <div class="hero__search">
          <SearchBox :lucky-resources="luckyCoverPool" />
        </div>
        <div class="hero__hot">
          <span class="hot-label">🔥 热门搜索</span>
          <a
            v-for="k in hotKeywords"
            :key="k"
            :href="`/search.html?q=${encodeURIComponent(k)}`"
            class="hot-tag"
          >{{ k }}</a>
        </div>
      </div>
    </section>

    <!-- 游戏推荐：每次打开随机从有封面的资源中选 8 个 -->
    <section v-if="featured.length" class="container section">
      <h2 class="section-title">🎲 游戏推荐</h2>
      <div class="rc-grid">
        <ResourceCard v-for="r in featured" :key="r.id" :r="r" />
      </div>
    </section>

    <!-- 最新资源 -->
    <section class="container section">
      <h2 class="section-title">🆕 最新更新</h2>
      <div class="rc-grid">
        <ResourceCard v-for="r in latest" :key="r.id" :r="r" />
      </div>
    </section>

    <!-- 更新日历 + 本周上新榜（均取自 home.json 轻量聚合，首页不拉全量） -->
    <section class="container section">
      <div class="retain-grid">
        <div class="glass retain-card">
          <h2 class="section-title">📅 更新日历 <span class="retain-sub text-low">近 14 天</span></h2>
          <div class="cal">
            <div v-for="d in calendar" :key="d.date" class="cal__col" :title="`${d.date} · ${d.count} 条`">
              <span class="cal__count">{{ d.count || '' }}</span>
              <span class="cal__track"><span class="cal__bar" :style="{ height: barHeight(d.count) }"></span></span>
              <span class="cal__date text-low">{{ d.label }}</span>
            </div>
          </div>
        </div>

        <div class="glass retain-card">
          <h2 class="section-title">🔥 本周上新榜</h2>
          <div v-if="weeklyTop.length" class="rank">
            <a v-for="(r, i) in weeklyTop" :key="r.id" :href="detailHref(r.id)" class="rank__row">
              <span class="rank__no" :class="`rank__no--${i + 1}`">{{ i + 1 }}</span>
              <span class="rank__thumb"><img v-if="r.cover" :src="r.cover" alt="" loading="lazy" /></span>
              <span class="rank__body">
                <span class="rank__title">{{ r.title }}</span>
                <span class="rank__meta text-low">{{ catLabel(r.category) }} · {{ fmtMD(r.addedAt) }}</span>
              </span>
            </a>
          </div>
          <p v-else class="retain-empty text-low">本周还没有新货，先看看上方的最新更新吧。</p>
        </div>
      </div>
    </section>

    <!-- 我的追更：本地无收藏/追分类时整块隐藏 -->
    <section v-if="showFollow" class="container section">
      <h2 class="section-title">⭐ 我的追更</h2>
      <div class="glass follow-panel">
        <div v-if="followItems.length" class="follow-chips">
          <a
            v-for="f in followItems"
            :key="f.key"
            :href="`/category.html?cat=${f.key}`"
            class="follow-chip"
            @click="markFollowSeen(f.key)"
          >
            <span class="follow-chip__emoji">{{ f.emoji }}</span>
            <span>你追的「{{ f.name }}」{{ f.count ? `有 ${f.count} 条新货` : '暂无新货' }}</span>
          </a>
        </div>
        <p v-else class="text-low">还没追更任何分类——去分类页点「☆ 追更这个分类」，有新货首页会提醒你。</p>
        <a href="/favorites.html" class="follow-panel__mine">查看我的收藏（{{ favCount() }}）→</a>
      </div>
    </section>

    <!-- 分类宫格 -->
    <section class="container section">
      <h2 class="section-title">🗂️ 资源分类</h2>
      <div class="cat-grid">
        <a
          v-for="(c, i) in state.categories"
          :key="c.key"
          :href="`/category.html?cat=${c.key}`"
          class="cat-card glass fade-up"
          :class="`fade-up-${(i % 3) + 1}`"
        >
          <div class="cat-card__icon" :style="iconStyle(c)">{{ c.emoji }}</div>
          <div class="cat-card__name">{{ c.name }}</div>
          <div class="cat-card__count text-low">{{ countBy(c.key) }} 个资源</div>
        </a>
      </div>
    </section>

    <!-- 最新动态（已隐藏）
         注意：P0 后首页走 useData.loadHome()，不再加载 commits.json（state.commits 恒为 []）。
         若要恢复本板块，需在 loadHome() 里补 fetch `${BASE}data/commits.json`。
    <section v-if="state.commits.length" class="container section">
      <h2 class="section-title">📡 最新动态</h2>
      <div class="commit-list glass">
        <a
          v-for="c in state.commits.slice(0, 10)"
          :key="c.hash"
          :href="c.url"
          target="_blank"
          rel="noreferrer"
          class="commit-item"
        >
          <span class="commit-item__msg">{{ c.message }}</span>
          <span class="commit-item__date text-low">{{ fmtDate(c.date) }}</span>
          <span class="commit-item__hash badge">{{ c.hash }}</span>
        </a>
      </div>
    </section>
    -->

    <!-- 数据统计条（页脚上方） -->
    <section class="container stats fade-up">
      <div class="stat">
        <div class="stat__num">{{ state.home?.total || 0 }}</div>
        <div class="stat__label text-low">资源总数</div>
      </div>
      <div class="stat">
        <div class="stat__num">{{ state.categories.length }}</div>
        <div class="stat__label text-low">游戏分类</div>
      </div>
      <div class="stat">
        <div class="stat__num">{{ lastMonthCount }}</div>
        <div class="stat__label text-low">本月新增</div>
      </div>
      <div class="stat">
        <div class="stat__num">100%</div>
        <div class="stat__label text-low">免费分享</div>
      </div>
    </section>

    <SiteFooter />

    <div v-if="announcementVisible" class="announcement-mask" @click.self="closeAnnouncement">
      <section class="announcement-modal glass" role="dialog" aria-modal="true" aria-labelledby="announcement-title">
        <button class="announcement-modal__close" type="button" title="关闭" aria-label="关闭公告" @click="closeAnnouncement">✕</button>
        <div class="announcement-modal__icon">📢</div>
        <p class="announcement-modal__eyebrow">GAMEHUB NOTICE</p>
        <h2 id="announcement-title">{{ announcement.title || '站点公告' }}</h2>
        <div class="announcement-socials">
          <a v-if="site?.qqGroup" :href="site.qqGroup" target="_blank" rel="noreferrer" class="announcement-social announcement-social--qq">
            <img class="announcement-social__icon" src="/qq-penguin.png" alt="" width="13" height="15" />
            <span>QQ群</span>
          </a>
          <a v-if="site?.androidApp && !IS_APP_WEBVIEW" :href="site.androidApp" class="announcement-social announcement-social--apk">
            <svg class="announcement-social__icon" viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.46 11.46 0 0 0-8.94 0L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L6.4 9.48A10.98 10.98 0 0 0 1 18h22a10.98 10.98 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"/></svg>
            <span>安卓APP</span>
          </a>
          <a v-if="site?.telegram" :href="site.telegram" target="_blank" rel="noreferrer" class="announcement-social announcement-social--tg">
            <svg class="announcement-social__icon" viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M21.9 3.6c.3-1.2-.9-2.2-2-1.7L2.7 9.8c-1.2.5-1.1 2.2.1 2.6l4.8 1.6 1.8 5.7c.4 1.1 1.8 1.4 2.6.6l2.5-2.5 4.7 3.5c1 .7 2.4.2 2.7-1l2.9-16.7zM9 14.2l8.5-6.9c.3-.2.6.2.4.5l-6.6 7.2c-.3.3-.8.4-1.2.3l-2.3-.8 1.2-.3z"/></svg>
            <span>TG频道</span>
          </a>
        </div>
        <div v-if="timelineItems.length" class="announcement-timeline">
          <div
            v-for="(it, i) in timelineItems"
            :key="it.date + i"
            class="tl-item"
            :class="{ open: expandedIdx === i, 'tl-item--latest': i === 0 }"
          >
            <span v-if="i === 0" class="tl-shine" aria-hidden="true"></span>
            <button
              type="button"
              class="tl-head"
              :aria-expanded="expandedIdx === i"
              @click="toggleTimeline(i)"
            >
              <span class="tl-dot" aria-hidden="true"></span>
              <span class="tl-main">
                <span class="tl-topline">
                  <span class="tl-date">{{ it.date }}</span>
                  <span v-if="it.tag" class="tl-tag">{{ it.tag }}</span>
                </span>
                <span class="tl-title">{{ it.title }}</span>
              </span>
              <span class="tl-chev" aria-hidden="true">{{ expandedIdx === i ? '▾' : '▸' }}</span>
            </button>
            <div v-show="expandedIdx === i" class="tl-body" v-html="linkify(it.content)"></div>
          </div>
        </div>
        <div v-else class="announcement-modal__content" v-html="linkify(announcement.content)"></div>
        <div class="announcement-modal__actions">
          <button class="btn btn-ghost" type="button" @click="closeAnnouncementForToday">今日关闭</button>
          <button class="btn btn-primary" type="button" @click="closeAnnouncement">关闭</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'
import BgWall from '../components/BgWall.vue'
import SearchBox from '../components/SearchBox.vue'
import ResourceCard from '../components/ResourceCard.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { useData } from '../composables/useData.js'
import { useFavorites } from '../composables/useFavorites.js'
import { detailHref } from '../lib/short.js'
import { BUILD_ID } from '../lib/version.js'
import { IS_APP_WEBVIEW } from '../lib/appEnv.js'

const { state, loadHome, catLabel } = useData()
const { favCount, followedCats, newCountFor, markFollowSeen } = useFavorites()
const site = computed(() => state.site)
const announcementVisible = ref(false)
const announcement = computed(() => state.site?.announcementModal || {})
const timelineItems = computed(() => Array.isArray(announcement.value.items) ? announcement.value.items : [])
const expandedIdx = ref(-1)
function toggleTimeline(i) {
  expandedIdx.value = expandedIdx.value === i ? -1 : i
}
// 公告正文安全渲染：转义 HTML，仅把 http(s) URL 变成可点击链接（target=_blank）
function linkify(text) {
  const esc = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return esc.replace(/(https?:\/\/[^\s<)】]+)/g, (u) => `<a href="${u}" target="_blank" rel="noopener" class="tl-link">${u}</a>`)
}
const ANNOUNCEMENT_DISMISSED_KEY = 'gamehub-announcement-dismissed'

// 热门搜索关键词：每次打开从 hotKeywords.json 的 100+ 词中随机选 6-7 个
const hotKeywords = ref([])
async function pickRandomHotKeywords() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/hotKeywords.json?v=${BUILD_ID || Date.now()}`)
    if (!res.ok) return
    const data = await res.json()
    const pool = Array.isArray(data.keywords) ? data.keywords : []
    // 随机洗牌
    const arr = [...pool]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    // 每次 6-7 个
    const n = 6 + Math.floor(Math.random() * 2)
    hotKeywords.value = arr.slice(0, n)
  } catch { /* 加载失败不展示 */ }
}

// 游戏推荐：每次打开页面从「有封面的资源池」中随机选 8 个（池来自 home.json）
const featured = ref([])
// 「手气不错」的随机池：同一份有封面的资源（home.json 的 coverPool，437 条）
const luckyCoverPool = computed(() => state.home?.coverPool || [])
function pickRandomFeatured() {
  const pool = state.home?.coverPool || []
  const arr = [...pool]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  featured.value = arr.slice(0, 8)
}
const latest = computed(() => state.home?.latest || [])

// ── 留存模块（数据全部来自 home.json 的轻量聚合，不触发全量加载）──
function dayKeyOf(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
// 更新日历：近 14 天（含今天）每天新增数，天数取浏览器本地日期
const calendar = computed(() => {
  const dc = state.home?.dailyCounts || {}
  const out = []
  const now = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const key = dayKeyOf(d)
    out.push({ date: key, label: `${d.getMonth() + 1}/${d.getDate()}`, count: dc[key] || 0 })
  }
  return out
})
const calMax = computed(() => Math.max(1, ...calendar.value.map((d) => d.count)))
function barHeight(n) {
  if (!n) return '3px'
  return `${Math.max(4, Math.round((n / calMax.value) * 110))}px`
}
// 本周上新榜：最近 7 天 addedAt 倒序 top 10（池 = home.recentCards 前 60 条）
const weeklyTop = computed(() => {
  const cards = state.home?.recentCards || []
  const keys = new Set()
  const now = new Date()
  for (let i = 0; i < 7; i++) {
    keys.add(dayKeyOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)))
  }
  return cards.filter((c) => keys.has(String(c.addedAt || '').slice(0, 10))).slice(0, 10)
})
// 追更：把 home.catRecent 摊平成 [{category, addedAt}] 供 newCountFor 计数
const followPool = computed(() => {
  const cr = state.home?.catRecent || {}
  const out = []
  for (const k of Object.keys(cr)) for (const t of cr[k]) out.push({ category: k, addedAt: t })
  return out
})
const followItems = computed(() =>
  followedCats().map((k) => {
    const c = state.categories.find((x) => x.key === k) || { key: k, name: k, emoji: '📦' }
    return { key: k, name: c.name, emoji: c.emoji, count: newCountFor(k, followPool.value) }
  })
)
const showFollow = computed(() => followItems.value.length > 0 || favCount() > 0)
function fmtMD(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const lastMonthCount = computed(() => {
  const now = new Date()
  const m = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  return state.home?.monthCounts?.[m] || 0
})

function countBy(key) {
  return state.home?.categoryCounts?.[key] || 0
}
function iconStyle(c) {
  return {
    background: `linear-gradient(135deg, ${c.gradient[0]}33, ${c.gradient[1]}22)`,
    border: `1px solid ${c.gradient[0]}55`,
    boxShadow: `0 0 20px ${c.gradient[0]}22`,
  }
}
function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function announcementVersion() {
  const item = announcement.value
  return item.version || `${item.title || ''}:${item.content || ''}`
}

function localDateKey() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function showAnnouncement() {
  const item = announcement.value
  const hasText = item.content
  const hasTimeline = Array.isArray(item.items) && item.items.length > 0
  if (!item.enabled || (!hasText && !hasTimeline)) return
  try {
    const dismissed = JSON.parse(localStorage.getItem(ANNOUNCEMENT_DISMISSED_KEY) || 'null')
    const today = localDateKey()
    if (dismissed?.version === announcementVersion() && dismissed?.date === today) return
  } catch { /* 浏览器禁用存储时仍允许公告正常显示 */ }
  announcementVisible.value = true
}

function closeAnnouncement() {
  announcementVisible.value = false
}

function closeAnnouncementForToday() {
  try {
    localStorage.setItem(ANNOUNCEMENT_DISMISSED_KEY, JSON.stringify({
      version: announcementVersion(),
      date: localDateKey(),
    }))
  } catch { /* 不阻断关闭操作 */ }
  closeAnnouncement()
}

onMounted(async () => {
  await loadHome()
  pickRandomFeatured()
  pickRandomHotKeywords()
  showAnnouncement()
})
</script>

<style scoped>
.home { min-height: 100vh; }

/* Announcement modal */
.announcement-mask {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--scrim);
  backdrop-filter: blur(8px);
  animation: announcement-fade 0.2s ease-out;
}
.announcement-modal {
  position: relative;
  width: min(100%, 540px);
  padding: 34px 34px 28px;
  text-align: center;
  box-shadow: 0 18px 70px rgba(0, 0, 0, 0.24), var(--shadow-card), var(--shadow-glow);
  animation: announcement-rise 0.25s ease-out;
}
.announcement-modal:hover { transform: none; }
.announcement-socials { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: -6px 0 18px; }
.announcement-social {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 100px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s;
}
.announcement-social__icon { display: inline-flex; font-size: 13px; line-height: 1; }
.announcement-social--qq { background: #366ef4; border: 1px solid #2a5ce0; }
.announcement-social--qq:hover { background: #2a5ce0; box-shadow: 0 0 12px rgba(54, 110, 244, 0.45); }
.announcement-social--tg { background: #1da1f2; border: 1px solid #1a91da; }
.announcement-social--tg:hover { background: #1a91da; box-shadow: 0 0 12px rgba(29, 161, 242, 0.45); }
/* 安卓 APP 按钮：镜面反光（原呼吸发光已取消） */
.announcement-social--apk { position: relative; overflow: hidden; background: #3ddc84; border: 1px solid #34c17a; color: #073042; }
.announcement-social--apk::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 38%, rgba(255, 255, 255, 0.55) 50%, transparent 62%);
  transform: translateX(-120%);
  animation: announcement-apk-shine 3s ease-in-out infinite;
  pointer-events: none;
}
.announcement-social--apk:hover { background: #34c17a; box-shadow: 0 0 12px rgba(61, 220, 132, 0.45); }
@keyframes announcement-apk-shine {
  0% { transform: translateX(-120%); }
  60%, 100% { transform: translateX(120%); }
}
.announcement-social--qq .announcement-social__icon { display: block; height: 15px; width: auto; }
.announcement-modal__close {
  position: absolute;
  top: 13px;
  right: 13px;
  width: 32px;
  height: 32px;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  background: transparent;
  color: var(--text-mid);
  font-size: 15px;
}
.announcement-modal__close:hover { color: var(--text-hi); border-color: var(--accent-gold); }
.announcement-modal__icon { font-size: 34px; line-height: 1; margin-bottom: 10px; }
.announcement-modal__eyebrow { color: var(--accent-gold); font: 600 11px var(--font-display); letter-spacing: 0.16em; margin-bottom: 6px; }
.announcement-modal h2 { font: 700 26px var(--font-display); margin-bottom: 18px; }
.announcement-modal__content { color: var(--text-mid); font-size: 15px; line-height: 1.9; white-space: pre-line; text-align: left; }

/* Timeline announcements */
.announcement-timeline {
  text-align: left;
  max-height: 46vh;
  overflow-y: auto;
  padding: 2px 6px 2px 0;
  scrollbar-width: thin;
}
.tl-item {
  position: relative;
  margin-bottom: 10px;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  background: rgba(var(--bg-1-rgb, 20, 20, 32), 0.45);
  transition: border-color 0.2s;
}
.tl-item:last-child { margin-bottom: 0; }
.tl-item.open { border-color: var(--accent-gold); }
/* 最新公告：镜面反光扫过，更醒目 */
.tl-item--latest { border-color: color-mix(in srgb, var(--accent-gold) 45%, var(--glass-border)); }
/* 裁剪层与位移层必须分开：clip-path 在元素自身坐标系里生效，会跟着 transform 一起跑，
   反光会扫出卡片外；所以裁圆角放在外层 .tl-shine，位移放在它的 ::after。
   （不能给 .tl-item 加 overflow:hidden：那会切断左侧时间线连接线 ::before） */
.tl-shine {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;
}
.tl-shine::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 46%;
  height: 100%;
  background: linear-gradient(105deg, transparent 0%, var(--shine-tail) 38%, var(--shine-core) 50%, var(--shine-tail) 62%, transparent 100%);
  transform: translateX(-150%) skewX(-16deg);
  animation: tl-latest-shine 3.4s ease-in-out infinite;
}
@keyframes tl-latest-shine {
  0% { transform: translateX(-150%) skewX(-16deg); }
  60%, 100% { transform: translateX(270%) skewX(-16deg); }
}
/* 展开后收起反光：高光扫过正文会干扰阅读，只在收起状态当提示用 */
.tl-item--latest.open .tl-shine { display: none; }
.tl-item::before {
  content: '';
  position: absolute;
  left: 19px;
  top: 34px;
  bottom: -10px;
  width: 2px;
  background: linear-gradient(180deg, var(--accent-gold), transparent);
  opacity: 0.35;
}
.tl-item:last-child::before { display: none; }
.tl-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  font: inherit;
}
.tl-dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent-gold);
  box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.55);
  margin-left: 2px;
  margin-right: 6px;
}
.tl-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.tl-topline { display: flex; align-items: center; gap: 8px; }
.tl-date {
  font: 700 11px var(--font-display);
  letter-spacing: 0.06em;
  color: var(--accent-gold);
}
.tl-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 100px;
  color: var(--accent-terracotta);
  border: 1px solid color-mix(in srgb, var(--accent-terracotta) 55%, transparent);
}
.tl-title { font-weight: 600; font-size: 14px; color: var(--text-hi); }
.tl-chev { color: var(--text-mid); font-size: 12px; transition: transform 0.2s; }
.tl-body {
  padding: 2px 16px 14px 51px;
  color: var(--text-mid);
  font-size: 13.5px;
  line-height: 1.8;
  white-space: pre-line;
}
.tl-link {
  color: var(--accent-gold);
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--accent-gold) 55%, transparent);
  text-underline-offset: 3px;
  word-break: break-all;
}
.tl-link:hover { color: var(--accent-terracotta); }
.announcement-modal__actions { display: flex; justify-content: center; gap: 10px; margin-top: 26px; }
@keyframes announcement-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes announcement-rise { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@media (prefers-reduced-motion: reduce) {
  .announcement-social--apk::after,
  .tl-shine::after { animation: none; }
}

/* Hero */
.hero { padding: 110px 0 50px; text-align: center; position: relative; z-index: 1; }
.hero__title {
  font-family: var(--font-display);
  font-size: clamp(40px, 6vw, 72px);
  font-weight: 700;
  line-height: 1.12;
  margin-bottom: 16px;
  animation: fadeInUp 0.6s ease-out 0.08s both;
}
.hero__title em {
  font-style: normal;
  background: linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-terracotta) 60%, var(--accent-gold-deep) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 24px rgba(var(--accent-rgb), 0.4));
}
.hero__subtitle {
  font-size: 16px;
  color: var(--text-mid);
  margin-bottom: 30px;
  animation: fadeInUp 0.6s ease-out 0.16s both;
}
.hero__search {
  max-width: 640px;
  margin: 0 auto;
  position: relative;
  z-index: 5; /* 让搜索下拉浮层盖过 .hero__hot（动画 transform 也会创建层叠上下文） */
  animation: fadeInUp 0.6s ease-out 0.24s both;
}
.hero__hot {
  margin-top: 22px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  animation: fadeInUp 0.6s ease-out 0.32s both;
}
.hero__hot .hot-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  margin-right: 2px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-gold);
  border: 1px dashed rgba(var(--accent-rgb), 0.55);
  background: rgba(var(--accent-rgb), 0.08);
  white-space: nowrap;
}
.hot-tag {
  padding: 7px 18px;
  border-radius: 100px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-hi);
  border: 1px solid rgba(var(--accent-rgb), 0.5);
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.22), rgba(var(--accent2-rgb), 0.1));
  box-shadow: inset 0 0 12px rgba(var(--accent-rgb), 0.06);
  letter-spacing: 0.02em;
  transition: all 0.2s;
}
.hot-tag:hover {
  color: #fff;
  border-color: var(--accent-gold);
  background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-deep));
  box-shadow: 0 0 18px rgba(var(--accent-rgb), 0.55), var(--shadow-glow);
  transform: translateY(-2px);
}

/* Stats（页脚上方，无边框） */
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  padding: 36px 0 8px;
  position: relative;
  z-index: 1;
  border-top: 1px solid rgba(var(--accent-rgb), 0.15);
  margin-top: 8px;
}
.stat { text-align: center; }
.stat__num {
  font-family: var(--font-display);
  font-size: clamp(30px, 4vw, 40px);
  font-weight: 700;
  line-height: 1.1;
  background: linear-gradient(135deg, var(--accent-gold), var(--accent-terracotta));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.stat__label { font-size: 13px; margin-top: 6px; letter-spacing: 0.08em; }

/* Categories */
.cat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.cat-card { padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
.cat-card__icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
}
.cat-card__name { font-size: 16px; font-weight: 700; }
.cat-card__count { font-size: 12px; }

/* Resource grid */
.rc-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

/* Commits */
.commit-list { padding: 8px 18px; }
.commit-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 0;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.08);
  transition: padding 0.2s;
}
.commit-item:last-child { border-bottom: none; }
.commit-item:hover { padding-left: 6px; }
.commit-item__msg { flex: 1; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.commit-item__date { font-size: 12px; flex-shrink: 0; }

@media (max-width: 1024px) {
  .cat-grid, .rc-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 768px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
  .cat-grid, .rc-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .rc-grid { grid-template-columns: repeat(2, 1fr); }
  .cat-grid { grid-template-columns: repeat(2, 1fr); }
  .announcement-modal { padding: 30px 22px 22px; }
  .announcement-modal h2 { font-size: 23px; }
}

/* ── 留存模块：更新日历 / 本周上新榜 / 我的追更 ── */
.retain-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: 18px;
  position: relative;
  z-index: 1;
}
/* 网格子项默认 min-width:auto：会被内容的 min-content 顶开 → 窄屏整页横向溢出。
   横向溢出又会让 position:fixed 的公告弹窗在多端上偏位（参照系被撑大）。显式归零。 */
.retain-grid > * { min-width: 0; }
.retain-card { padding: 22px 22px 18px; }
.retain-card:hover { transform: none; }
.retain-sub {
  font-family: var(--font-body, inherit);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
}
.retain-empty { font-size: 14px; padding: 12px 0; }

/* 更新日历 */
.cal { display: flex; align-items: flex-end; gap: 4px; padding-top: 6px; min-width: 0; }
.cal__col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.cal__count { font-size: 10.5px; font-weight: 700; color: var(--text-mid); height: 14px; }
.cal__track { height: 110px; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
.cal__bar {
  width: 62%;
  max-width: 26px;
  border-radius: 4px 4px 2px 2px;
  background: linear-gradient(180deg, var(--accent-gold), var(--accent-gold-deep));
  box-shadow: 0 0 10px rgba(var(--accent-rgb), 0.35);
  transition: height 0.3s ease;
}
.cal__col:hover .cal__bar { box-shadow: 0 0 16px rgba(var(--accent-rgb), 0.6); }
.cal__date { font-size: 10px; white-space: nowrap; }

/* 本周上新榜 */
.rank { display: flex; flex-direction: column; min-width: 0; }
.rank__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.08);
  transition: padding 0.2s;
}
.rank__row:last-child { border-bottom: none; }
.rank__row:hover { padding-left: 9px; }
.rank__no {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-low);
  background: rgba(var(--accent-rgb), 0.08);
}
.rank__no--1 { color: #3b1e00; background: linear-gradient(135deg, #ffd45c, #ff9f22); }
.rank__no--2 { color: var(--text-hi); background: rgba(255, 255, 255, 0.16); }
.rank__no--3 { color: #3b1e00; background: linear-gradient(135deg, #e8c48a, #c99a5b); }
.rank__thumb {
  flex: none;
  width: 44px;
  height: 30px;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(var(--accent-rgb), 0.1);
}
.rank__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.rank__body { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.rank__title {
  font-size: 13.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rank__meta { font-size: 11.5px; }

/* 我的追更 */
.follow-panel { padding: 18px 20px; position: relative; z-index: 1; }
.follow-panel:hover { transform: none; }
.follow-chips { display: flex; flex-wrap: wrap; gap: 10px; }
.follow-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 100px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-hi);
  border: 1px solid rgba(var(--accent-rgb), 0.45);
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.2), rgba(var(--accent2-rgb), 0.08));
  transition: all 0.2s;
}
.follow-chip:hover {
  color: #fff;
  border-color: var(--accent-gold);
  background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-deep));
  box-shadow: 0 0 18px rgba(var(--accent-rgb), 0.5);
  transform: translateY(-2px);
}
.follow-chip__emoji { font-size: 16px; }
.follow-panel__mine {
  display: inline-block;
  margin-top: 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-gold);
}
.follow-panel__mine:hover { color: var(--accent-terracotta); }

@media (max-width: 900px) {
  /* 这里必须是 minmax(0,1fr)：裸 1fr 的自动最小值 = 内容 min-content，会被日历的
     14 个不换行日期顶开，把整个文档撑宽到 564px（实测）。这正是弹窗偏位 + 整站变宽的根因。 */
  .retain-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 560px) {
  .cal__date { font-size: 9px; }
  .cal { gap: 2px; }
  .retain-card { padding: 18px 14px 14px; }
}
</style>
