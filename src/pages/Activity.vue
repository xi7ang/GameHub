<template>
  <div class="activity-page">
    <SiteHeader />
    <BgWall />

    <section class="hero">
      <div class="container hero__inner">
        <span class="hero__badge">🎮 内容推广活动</span>
        <h1 class="hero__title">{{ cfg?.title || '内容推广活动' }}</h1>
        <p v-if="cfg?.subtitle" class="hero__sub">{{ cfg.subtitle }}</p>
        <div class="hero__actions">
          <a class="btn btn-primary hero__cta" href="#code">🎟 先领通行证</a>
          <a class="btn hero__cta2" href="#rewards">🎁 看看奖励</a>
        </div>
        <div v-if="period" class="hero__period">📅 {{ period }}</div>
      </div>
    </section>

    <section v-if="!cfg" class="container">
      <div class="glass act-block">活动数据加载中…</div>
    </section>

    <section v-else-if="!cfg.enabled" class="container">
      <div class="glass act-block">活动准备中，等我们喊你 🎈</div>
    </section>

    <template v-else>
      <!-- 三步走 -->
      <section class="container">
        <div class="steps">
          <div class="step glass">
            <span class="step__no">01</span>
            <span class="step__icon">🎟</span>
            <span class="step__name">领通行证</span>
            <span class="step__desc">点一下生成专属口令</span>
          </div>
          <div class="step glass">
            <span class="step__no">02</span>
            <span class="step__icon">✍️</span>
            <span class="step__name">发一篇</span>
            <span class="step__desc">小红书 / B站 / 微博 / 知乎</span>
          </div>
          <div class="step glass">
            <span class="step__no">03</span>
            <span class="step__icon">🎁</span>
            <span class="step__name">交作品拿奖</span>
            <span class="step__desc">链接 + 口令，发到入口就行</span>
          </div>
        </div>
      </section>

      <!-- 玩法 -->
      <section class="container" id="how">
        <div class="glass act-block">
          <h2 class="act-block__title">就这么玩</h2>
          <p class="act-intro">{{ cfg.intro }}</p>
          <ul class="act-rules">
            <li v-for="(r, i) in cfg.rules" :key="r">
              <span class="act-rules__no">{{ i + 1 }}</span>
              <span>{{ r }}</span>
            </li>
          </ul>
          <div v-if="cfg.bans?.length" class="act-tips">
            <div class="act-tips__head">✨ 一点小经验，照这样写更容易火</div>
            <ul>
              <li v-for="b in cfg.bans" :key="b">{{ b }}</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- 奖励 -->
      <section class="container" id="rewards">
        <h2 class="act-sec__title">奖励</h2>
        <div class="act-rewards">
          <div v-for="(r, i) in cfg.rewards" :key="i" class="reward glass" :class="`reward--${i}`">
            <span class="reward__glow" aria-hidden="true"></span>
            <span class="reward__icon">{{ rewardIcon(i) }}</span>
            <span class="reward__tier">{{ r.tier }}</span>
            <span class="reward__cond">{{ r.cond }}</span>
            <span class="reward__gift">{{ r.gift }}</span>
          </div>
        </div>
      </section>

      <!-- 通行证 -->
      <section class="container" id="code">
        <div class="ticket">
          <div class="ticket__left">
            <span class="ticket__label">🎟 你的通行证</span>
            <code class="ticket__code">{{ code || 'GH-~~~~' }}</code>
            <span class="ticket__hint">复制文案时会自动带上它，交作品时报这个号就行</span>
          </div>
          <div class="ticket__right">
            <button class="btn btn-primary" @click="genCode">{{ code ? '🔄 换一张' : '✨ 生成通行证' }}</button>
            <button class="btn" :disabled="!code" @click="copy(code, 'code')">
              {{ copied === 'code' ? '✅ 已复制' : '📋 复制口令' }}
            </button>
          </div>
        </div>
      </section>

      <!-- 平台 -->
      <section class="container" id="platforms">
        <h2 class="act-sec__title">挑一个平台，文案我们都写好了</h2>
        <div class="act-platforms">
          <article v-for="p in cfg.platforms" :key="p.key" class="plat glass">
            <header class="plat__head">
              <span class="plat__name">{{ p.emoji }} {{ p.name }}</span>
              <span class="plat__link">{{ p.linkPolicy }}</span>
            </header>
            <div class="plat__rows">
              <div class="plat__row">
                <span class="plat__k">发什么</span>
                <span class="plat__v">{{ p.form }}</span>
              </div>
              <div class="plat__row">
                <span class="plat__k">怎么发</span>
                <span class="plat__v">{{ p.reqs }}</span>
              </div>
              <div class="plat__row plat__row--tip">
                <span class="plat__k">小提示</span>
                <span class="plat__v">{{ p.bans }}</span>
              </div>
            </div>
            <div class="plat__tpl">
              <div class="plat__tpl-title">《{{ p.title }}》</div>
              <pre class="plat__tpl-body">{{ withCode(p.body) }}</pre>
              <div class="plat__tpl-tags">{{ p.tags }}</div>
            </div>
            <button class="btn btn-primary plat__copy" @click="copyPlatform(p)">
              {{ copied === p.key ? '✅ 复制好了，去发吧' : '📋 一键复制文案' }}
            </button>
          </article>
        </div>
      </section>

      <!-- 素材 -->
      <section v-if="cfg.materials?.length" class="container">
        <h2 class="act-sec__title">配图拿去用</h2>
        <div class="act-materials">
          <a
            v-for="m in cfg.materials"
            :key="m.path"
            class="mat glass"
            :href="m.path"
            target="_blank"
            rel="noreferrer"
            download
          >
            <img class="mat__thumb" :src="m.path" :alt="m.name" loading="lazy" />
            <div class="mat__meta">
              <span class="mat__name">{{ m.name }}</span>
              <span class="mat__note">{{ m.note }}</span>
            </div>
            <span class="mat__dl">下载 ↓</span>
          </a>
        </div>
      </section>

      <!-- 提交 -->
      <section class="container" id="submit">
        <div class="glass act-block act-submit">
          <h2 class="act-block__title">发完了？来交作品 🚀</h2>
          <p class="act-intro">{{ cfg.submitNote }}</p>
          <a class="btn btn-primary act-submit__btn" :href="cfg.submitUrl" target="_blank" rel="noreferrer">
            ✈️ 带口令去交作品
          </a>
        </div>
      </section>

      <!-- 榜单 -->
      <section class="container">
        <h2 class="act-sec__title">🏆 荣誉榜</h2>
        <div class="glass act-block">
          <div v-if="board?.items?.length" class="act-board">
            <div v-for="(it, i) in board.items" :key="i" class="act-board__row">
              <span class="act-board__rank">{{ medal(it.rank) }}</span>
              <span class="act-board__nick">{{ it.nick }}</span>
              <span class="act-board__plat">{{ platText(it.platforms) }}</span>
              <span class="act-board__works">{{ it.works }} 篇</span>
              <span class="act-board__reward">{{ it.reward }}</span>
            </div>
            <p v-if="board.updatedAt" class="act-board__time">更新于 {{ board.updatedAt }}</p>
          </div>
          <div v-else class="board-empty">
            <span class="board-empty__icon">🥇</span>
            <span class="board-empty__text">第一期的榜首位还空着，想不想占一下？</span>
          </div>
        </div>
      </section>

      <section class="container">
        <p class="act-foot">
          内容发在你自己的号上，怎么写得舒服怎么来。参与即表示同意
          <a href="/disclaimer.html">免责声明</a> 🐧
        </p>
      </section>
    </template>

    <SiteFooter />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'
import BgWall from '../components/BgWall.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { useData } from '../composables/useData.js'
import { BUILD_ID } from '../lib/version.js'

const { load } = useData()
const BASE = import.meta.env.BASE_URL
const cfg = ref(null)
const board = ref(null)
const code = ref('')
const copied = ref('')
const CODE_KEY = 'gamehub-activity-code'

const period = computed(() => {
  const c = cfg.value
  if (!c?.startAt || !c?.endAt) return ''
  return `${c.startAt} ~ ${c.endAt}`
})

async function loadActivity() {
  // 按 cache-and-version 约定：所有 data/*.json 都带构建号，否则会赖在用户浏览器里
  const cb = `v=${BUILD_ID || 'dev'}`
  const [c, b] = await Promise.all([
    fetch(`${BASE}data/activity.json?${cb}`).then((r) => r.json()).catch(() => null),
    fetch(`${BASE}data/activity-leaderboard.json?${cb}`).then((r) => r.json()).catch(() => null),
  ])
  cfg.value = c
  board.value = b
}

function platText(platforms) {
  return Array.isArray(platforms) ? platforms.join(' / ') : String(platforms || '')
}
function rewardIcon(i) {
  return ['🎁', '🔥', '👑'][i] || '🎁'
}
function medal(rank) {
  return ['', '🥇', '🥈', '🥉'][Number(rank)] || `#${rank}`
}
function genCode() {
  const seg = () => Math.random().toString(36).slice(2, 6).toUpperCase()
  code.value = `${cfg.value?.codePrefix || 'GH-'}${seg()}`
  try { localStorage.setItem(CODE_KEY, code.value) } catch (e) { /* 隐私模式忽略 */ }
}
function withCode(text) {
  return String(text || '').replace(/\{\{code\}\}/g, code.value || '你的口令')
}
async function copy(text, tag) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = tag
    setTimeout(() => { if (copied.value === tag) copied.value = '' }, 2200)
  } catch (e) {
    alert('复制失败，请手动选中复制')
  }
}
function copyPlatform(p) {
  if (!code.value) genCode()
  const txt = `【标题】${p.title}\n\n${p.body}\n\n${p.tags || ''}\n\n活动口令：${code.value}`
  copy(txt.replace(/\{\{code\}\}/g, code.value), p.key)
}

onMounted(async () => {
  try { const saved = localStorage.getItem(CODE_KEY); if (saved) code.value = saved } catch (e) { /* ignore */ }
  await Promise.all([load(), loadActivity()])
})
</script>

<style scoped>
/* ── Hero ── */
.hero { padding: 58px 0 30px; position: relative; z-index: 1; }
.hero__inner { max-width: 900px; }
.hero__badge { display: inline-block; padding: 5px 14px; border-radius: 999px; font-size: 12px; font-weight: 700;
  color: #3b1e00; background: linear-gradient(135deg, #ffd45c, #ff9f22); }
.hero__title { font-family: var(--font-display); font-size: 40px; font-weight: 700; line-height: 1.25; margin-top: 14px; }
.hero__sub { color: var(--text-mid); font-size: 16px; line-height: 1.85; margin-top: 12px; }
.hero__actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 22px; }
.hero__cta { font-size: 16px; padding: 13px 28px; border-radius: 14px; }
.hero__cta2 { font-size: 16px; padding: 13px 26px; border-radius: 14px; }
.hero__period { display: inline-block; margin-top: 18px; font-size: 13px; color: var(--text-low); }

/* ── 三步走 ── */
.steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 18px; position: relative; z-index: 1; }
.step { position: relative; padding: 20px 22px; display: flex; flex-direction: column; gap: 4px;
  transition: transform 0.2s ease, border-color 0.2s ease; }
.step:hover { transform: translateY(-3px); border-color: var(--accent-gold); }
.step__no { position: absolute; right: 16px; top: 12px; font-family: var(--font-display); font-size: 30px;
  font-weight: 700; color: rgba(var(--accent-rgb), 0.22); }
.step__icon { font-size: 24px; }
.step__name { font-family: var(--font-display); font-weight: 700; font-size: 16px; }
.step__desc { font-size: 13px; color: var(--text-low); }

/* ── 通用块 ── */
.act-block { padding: 26px 30px; position: relative; z-index: 1; margin-bottom: 18px; }
.act-block__title { font-family: var(--font-display); font-size: 20px; font-weight: 700; margin-bottom: 12px; }
.act-sec__title { font-family: var(--font-display); font-size: 22px; font-weight: 700; margin: 24px 0 14px; position: relative; z-index: 1; }
.act-intro { color: var(--text-mid); font-size: 15px; line-height: 1.95; }
.act-rules { margin: 16px 0 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
.act-rules li { display: flex; gap: 10px; color: var(--text-mid); font-size: 14px; line-height: 1.8; }
.act-rules__no { flex: 0 0 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: var(--neon-gold); background: rgba(var(--accent-rgb), 0.12); }
.act-tips { margin-top: 20px; padding: 16px 18px; border-radius: 14px;
  border: 1px dashed rgba(var(--accent-rgb), 0.35); background: rgba(var(--accent-rgb), 0.05); }
.act-tips__head { font-size: 14px; font-weight: 700; color: var(--neon-gold); margin-bottom: 8px; }
.act-tips ul { margin: 0; padding-left: 20px; color: var(--text-mid); font-size: 13px; line-height: 1.85; }

/* ── 奖励 ── */
.act-rewards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; position: relative; z-index: 1; }
.reward { position: relative; overflow: hidden; padding: 22px 22px 24px; display: flex; flex-direction: column; gap: 6px;
  transition: transform 0.2s ease; }
.reward:hover { transform: translateY(-4px); }
.reward__glow { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background: radial-gradient(circle at 82% 12%, rgba(255, 170, 60, 0.22), transparent 62%); }
.reward__icon { font-size: 28px; }
.reward__tier { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--neon-gold); }
.reward__cond { font-size: 13px; color: var(--text-mid); line-height: 1.7; }
.reward__gift { margin-top: 6px; font-size: 14px; font-weight: 600; color: var(--text-hi); }
.reward--1 { border-color: rgba(255, 159, 34, 0.4); }

/* ── 通行证 ── */
.ticket { position: relative; z-index: 1; display: flex; flex-wrap: wrap; align-items: center; gap: 18px;
  padding: 24px 28px; border-radius: 18px; border: 1px dashed rgba(var(--accent-rgb), 0.5);
  background: linear-gradient(120deg, rgba(var(--accent-rgb), 0.16), rgba(var(--accent-rgb), 0.04) 60%, transparent); }
.ticket__left { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 220px; }
.ticket__label { font-size: 13px; font-weight: 700; color: var(--neon-gold); }
.ticket__code { font-family: var(--font-display); font-size: 30px; font-weight: 700; letter-spacing: 0.16em; color: var(--text-hi); }
.ticket__hint { font-size: 12px; color: var(--text-low); }
.ticket__right { display: flex; gap: 10px; flex-wrap: wrap; }

/* ── 平台卡 ── */
.act-platforms { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; position: relative; z-index: 1; }
.plat { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.plat__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.plat__name { font-family: var(--font-display); font-weight: 700; font-size: 17px; }
.plat__link { font-size: 11px; color: var(--text-low); border: 1px solid var(--glass-border); border-radius: 999px; padding: 4px 10px; }
.plat__rows { display: flex; flex-direction: column; gap: 6px; }
.plat__row { display: flex; gap: 10px; font-size: 13px; line-height: 1.7; }
.plat__k { flex: 0 0 52px; color: var(--text-low); }
.plat__v { color: var(--text-mid); flex: 1; }
.plat__row--tip .plat__v { color: var(--text-low); }
.plat__tpl { border-radius: 12px; padding: 12px 14px; background: rgba(var(--bg-0-rgb), 0.45); border: 1px solid var(--glass-border); }
.plat__tpl-title { font-size: 14px; font-weight: 700; margin-bottom: 6px; }
.plat__tpl-body { margin: 0; font-family: inherit; font-size: 13px; line-height: 1.8; color: var(--text-mid);
  white-space: pre-wrap; word-break: break-word; }
.plat__tpl-tags { margin-top: 8px; font-size: 12px; color: var(--neon-cyan); }
.plat__copy { align-self: flex-start; }

/* ── 素材 ── */
.act-materials { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; position: relative; z-index: 1; }
.mat { display: flex; align-items: center; gap: 14px; padding: 14px; transition: transform 0.2s ease, border-color 0.2s ease; }
.mat:hover { transform: translateY(-3px); border-color: var(--accent-gold); }
.mat__thumb { width: 120px; height: 120px; object-fit: contain; border-radius: 10px; flex: 0 0 auto;
  padding: 4px; background: rgba(var(--bg-0-rgb), 0.6); border: 1px solid var(--glass-border); }
.mat__meta { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.mat__name { font-size: 14px; font-weight: 600; }
.mat__note { font-size: 12px; color: var(--text-low); }
.mat__dl { font-size: 12px; color: var(--neon-cyan); white-space: nowrap; }

/* ── 提交 ── */
.act-submit__btn { margin-top: 16px; font-size: 17px; font-weight: 800; padding: 15px 30px; border-radius: 16px; }

/* ── 榜单 ── */
.act-board { display: flex; flex-direction: column; gap: 8px; }
.act-board__row { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.06); font-size: 13px; }
.act-board__rank { font-size: 16px; width: 30px; }
.act-board__nick { font-weight: 600; }
.act-board__plat, .act-board__works { color: var(--text-mid); }
.act-board__reward { margin-left: auto; color: var(--text-hi); }
.act-board__time { font-size: 12px; color: var(--text-low); margin-top: 4px; }
.board-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 26px 10px; }
.board-empty__icon { font-size: 34px; }
.board-empty__text { color: var(--text-mid); font-size: 14px; }

.act-foot { color: var(--text-low); font-size: 13px; margin: 6px 0 40px; position: relative; z-index: 1; }
.act-foot a { color: var(--neon-cyan); }

@media (max-width: 768px) {
  .hero { padding: 40px 0 22px; }
  .hero__title { font-size: 26px; }
  .hero__sub { font-size: 14px; }
  .hero__cta, .hero__cta2 { flex: 1; justify-content: center; padding: 12px 16px; font-size: 15px; }
  .steps { grid-template-columns: 1fr; }
  .act-block { padding: 20px 18px; }
  .act-rewards { grid-template-columns: 1fr; }
  .act-platforms { grid-template-columns: 1fr; }
  .act-materials { grid-template-columns: 1fr; }
  .ticket { padding: 20px 18px; }
  .ticket__code { font-size: 24px; }
  .ticket__right { width: 100%; }
  .ticket__right .btn { flex: 1; justify-content: center; }
  .act-board__row { flex-wrap: wrap; }
  .act-board__reward { margin-left: 0; width: 100%; }
}
</style>
