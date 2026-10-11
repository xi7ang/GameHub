<template>
  <div v-if="announcementVisible" class="announcement-mask" @click.self="closeAnnouncement">
    <section class="announcement-modal glass" role="dialog" aria-modal="true" aria-labelledby="announcement-title">
      <button class="announcement-modal__close" type="button" title="关闭" aria-label="关闭公告" @click="closeAnnouncement">✕</button>
      <div class="announcement-modal__icon">📢</div>
      <p class="announcement-modal__eyebrow">GAMEHUB NOTICE</p>
      <h2 id="announcement-title">{{ announcement.title || '站点公告' }}</h2>
      <div class="announcement-socials">
        <a href="https://v.devmini.space" target="_blank" rel="noreferrer" class="announcement-social announcement-social--film">
          <span class="announcement-social__icon announcement-social__flame" aria-hidden="true">🔥</span>
          <span>同名影视资源站</span>
        </a>
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
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData } from '../composables/useData.js'
import { IS_APP_WEBVIEW } from '../lib/appEnv.js'

const { state, load } = useData()
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
// 「今日关闭」：按天记在 localStorage
const ANNOUNCEMENT_DISMISSED_KEY = 'gamehub-announcement-dismissed'
// 本次会话内点过「关闭」（含 ✕ / 点遮罩 / Esc / 按钮）就不再弹；刷新页面后重置
const SESSION_KEY = 'gamehub-nav-dismissed-session'

function announcementVersion() {
  const item = announcement.value
  return item.version || `${item.title || ''}:${item.content || ''}`
}

function localDateKey() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function isDismissedToday() {
  try {
    const dismissed = JSON.parse(localStorage.getItem(ANNOUNCEMENT_DISMISSED_KEY) || 'null')
    return dismissed?.version === announcementVersion() && dismissed?.date === localDateKey()
  } catch { return false }
}

function showAnnouncement() {
  const item = announcement.value
  const hasText = item.content
  const hasTimeline = Array.isArray(item.items) && item.items.length > 0
  if (!item.enabled || (!hasText && !hasTimeline)) return
  try {
    // 本次会话已关闭 → 不再弹（刷新 / 新开标签即失效）
    if (sessionStorage.getItem(SESSION_KEY)) return
  } catch { /* 浏览器禁用存储时仍允许公告正常显示 */ }
  if (isDismissedToday()) return
  expandedIdx.value = 0   // 最新一条公告（时间线索引 0）默认展开
  announcementVisible.value = true
}

function closeAnnouncement() {
  try { sessionStorage.setItem(SESSION_KEY, '1') } catch { /* 不阻断关闭操作 */ }
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

// 弹窗渲染根节点是页面根组件的兄弟节点。子组件 onMounted 早于父组件：
// 页面自身的 load()/loadHome() 此刻尚未启动，这里再触发一次会与页面重复请求，
// 因此等 state.site 就绪后再展示。
let stopWatch = null
let fallbackTimer = null
let settled = false

function settle() {
  if (settled) return
  settled = true
  if (stopWatch) { stopWatch(); stopWatch = null }
  if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null }
  showAnnouncement()
}

onMounted(() => {
  if (state.site) { settle(); return }
  stopWatch = watch(() => state.site, (v) => { if (v) settle() })
  // 兜底：页面自身未加载 site 的场景（5s 足够页面自身加载完成，避免重复请求）
  fallbackTimer = setTimeout(async () => {
    fallbackTimer = null
    if (state.site) { settle(); return }
    await load()
    settle()
  }, 5000)
})

onBeforeUnmount(() => {
  if (stopWatch) { stopWatch(); stopWatch = null }
  if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null }
})
</script>

<style scoped>
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
/* 同名影视资源站：暖金火焰渐变 + 动态火焰图标，最醒目，排在最前 */
.announcement-social--film {
  background: linear-gradient(135deg, #ff7a2f, #ef4a26 55%, #c9302c);
  border: 1px solid #ff9a5a;
  font-weight: 700;
  box-shadow: 0 0 14px rgba(255, 96, 40, 0.55), inset 0 0 0 1px rgba(255, 255, 255, 0.14);
}
.announcement-social--film:hover {
  background: linear-gradient(135deg, #ff8b45, #f2552e 55%, #d63a30);
  box-shadow: 0 0 22px rgba(255, 96, 40, 0.85);
  transform: translateY(-1px);
}
.announcement-social__flame {
  display: inline-block;
  font-size: 14px;
  transform-origin: 50% 85%;
  animation: film-flame 1.1s ease-in-out infinite;
  filter: drop-shadow(0 0 4px rgba(255, 150, 50, 0.9));
}
@keyframes film-flame {
  0%, 100% { transform: scale(1) rotate(-4deg) translateY(0); opacity: 1; }
  25% { transform: scale(1.2) rotate(3deg) translateY(-1px); opacity: 0.9; }
  50% { transform: scale(1.05) rotate(-2deg) translateY(0); opacity: 1; }
  75% { transform: scale(1.25) rotate(4deg) translateY(-2px); opacity: 0.88; }
}
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
  .announcement-social__flame,
  .tl-shine::after { animation: none; }
}

/* 窄屏：弹窗内边距与标题字号 */
@media (max-width: 480px) {
  .announcement-modal { padding: 30px 22px 22px; }
  .announcement-modal h2 { font-size: 23px; }
}
</style>
