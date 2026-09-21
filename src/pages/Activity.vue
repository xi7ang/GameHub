<template>
  <div class="activity-page">
    <SiteHeader />
    <BgWall />
    <section class="page-hero">
      <div class="container">
        <h1 class="page-hero__title">🎁 {{ cfg?.title || '内容推广活动' }}</h1>
        <p v-if="cfg?.subtitle" class="page-hero__sub">{{ cfg.subtitle }}</p>
        <div v-if="period" class="page-hero__period">活动时间：{{ period }}</div>
      </div>
    </section>

    <section v-if="!cfg" class="container">
      <div class="glass act-block">活动数据加载中…</div>
    </section>

    <section v-else-if="!cfg.enabled" class="container">
      <div class="glass act-block">活动暂未开始，请留意站内公告。</div>
    </section>

    <template v-else>
      <!-- 玩法 -->
      <section class="container">
        <div class="glass act-block">
          <h2 class="act-block__title">活动怎么玩</h2>
          <p class="act-intro">{{ cfg.intro }}</p>
          <ol class="act-rules">
            <li v-for="r in cfg.rules" :key="r">{{ r }}</li>
          </ol>
          <div class="act-warn">
            <strong>红线（踩了会封的是你的号，我们不补）</strong>
            <ul>
              <li v-for="b in cfg.bans" :key="b">{{ b }}</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- 奖励 -->
      <section class="container">
        <div class="glass act-block">
          <h2 class="act-block__title">奖励阶梯</h2>
          <div class="act-rewards">
            <div v-for="(r, i) in cfg.rewards" :key="i" class="act-reward">
              <div class="act-reward__tier">{{ r.tier }}</div>
              <div class="act-reward__cond">{{ r.cond }}</div>
              <div class="act-reward__gift">{{ r.gift }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 口令 -->
      <section class="container">
        <div class="glass act-block">
          <h2 class="act-block__title">第一步：领一个你的专属口令</h2>
          <p class="act-intro">口令用来去重和归因。复制文案时会自动带上它，提交作品时也要报口令。</p>
          <div class="act-code">
            <code class="act-code__val">{{ code || '还没有口令' }}</code>
            <button class="btn" @click="genCode">{{ code ? '换一个' : '生成口令' }}</button>
            <button class="btn btn-primary" :disabled="!code" @click="copy(code, 'code')">
              {{ copied === 'code' ? '✅ 已复制' : '📋 复制口令' }}
            </button>
          </div>
        </div>
      </section>

      <!-- 平台 -->
      <section class="container">
        <h2 class="act-sec__title">第二步：挑一个平台，复制文案去发布</h2>
        <div class="act-platforms">
          <article v-for="p in cfg.platforms" :key="p.key" class="glass act-platform">
            <header class="act-platform__head">
              <span class="act-platform__name">{{ p.emoji }} {{ p.name }}</span>
              <span class="act-platform__link">{{ p.linkPolicy }}</span>
            </header>
            <dl class="act-platform__meta">
              <div><dt>作品形态</dt><dd>{{ p.form }}</dd></div>
              <div><dt>硬性要求</dt><dd>{{ p.reqs }}</dd></div>
              <div><dt>内容禁区</dt><dd class="is-danger">{{ p.bans }}</dd></div>
            </dl>
            <div class="act-platform__tpl">
              <div class="act-platform__tpl-title">《{{ p.title }}》</div>
              <pre class="act-platform__tpl-body">{{ withCode(p.body) }}</pre>
              <div class="act-platform__tpl-tags">{{ p.tags }}</div>
            </div>
            <button class="btn btn-primary act-platform__copy" @click="copyPlatform(p)">
              {{ copied === p.key ? '✅ 已复制，去发布吧' : '📋 一键复制文案（含口令）' }}
            </button>
          </article>
        </div>
      </section>

      <!-- 素材 -->
      <section v-if="cfg.materials?.length" class="container">
        <div class="glass act-block">
          <h2 class="act-block__title">配图素材</h2>
          <div class="act-materials">
            <a
              v-for="m in cfg.materials"
              :key="m.path"
              class="act-material"
              :href="m.path"
              target="_blank"
              rel="noreferrer"
              download
            >
              <span class="act-material__name">{{ m.name }}</span>
              <span class="act-material__note">{{ m.note }}</span>
              <span class="act-material__dl">下载</span>
            </a>
          </div>
        </div>
      </section>

      <!-- 提交 -->
      <section class="container">
        <div class="glass act-block">
          <h2 class="act-block__title">第三步：提交作品</h2>
          <p class="act-intro">{{ cfg.submitNote }}</p>
          <a class="btn btn-primary act-submit" :href="cfg.submitUrl" target="_blank" rel="noreferrer">🚀 去提交作品</a>
        </div>
      </section>

      <!-- 榜单 -->
      <section class="container">
        <div class="glass act-block">
          <h2 class="act-block__title">
            榜单
            <span v-if="board?.updatedAt" class="act-board__time">更新于 {{ board.updatedAt }}</span>
          </h2>
          <div v-if="board?.items?.length" class="act-board">
            <div v-for="(it, i) in board.items" :key="i" class="act-board__row">
              <span class="act-board__rank">{{ it.rank }}</span>
              <span class="act-board__nick">{{ it.nick }}</span>
              <span class="act-board__plat">{{ platText(it.platforms) }}</span>
              <span class="act-board__works">{{ it.works }} 篇</span>
              <span class="act-board__reward">{{ it.reward }}</span>
            </div>
          </div>
          <p v-else class="act-intro">榜单每周更新一次，第一期从活动开始日起记录。</p>
        </div>
      </section>

      <section class="container">
        <p class="act-foot">
          参与即表示你已阅读并同意
          <a href="/disclaimer.html">免责声明</a>。请遵守各平台规则，账号风险自负。
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
.page-hero { padding: 56px 0 26px; position: relative; z-index: 1; }
.page-hero__title { font-family: var(--font-display); font-size: 32px; font-weight: 700; line-height: 1.3; }
.page-hero__sub { color: var(--text-mid); font-size: 14px; margin-top: 10px; line-height: 1.8; }
.page-hero__period { display: inline-block; margin-top: 12px; padding: 4px 12px; border-radius: 999px;
  border: 1px solid var(--glass-border); background: rgba(var(--accent-rgb), 0.08); font-size: 12px; color: var(--text-mid); }

.act-block { padding: 26px 30px; position: relative; z-index: 1; margin-bottom: 18px; }
.act-block__title { font-family: var(--font-display); font-size: 18px; font-weight: 700; margin-bottom: 12px; }
.act-sec__title { font-family: var(--font-display); font-size: 20px; font-weight: 700; margin: 6px 0 14px; position: relative; z-index: 1; }
.act-intro { color: var(--text-mid); font-size: 14px; line-height: 1.9; }
.act-rules { margin: 14px 0 0 0; padding-left: 20px; color: var(--text-mid); font-size: 14px; line-height: 1.9; }
.act-warn { margin-top: 18px; padding: 14px 16px; border-radius: 12px; font-size: 13px;
  border: 1px solid rgba(244, 63, 94, 0.35); background: rgba(244, 63, 94, 0.08); color: var(--text-mid); }
.act-warn strong { color: #fb7185; }
.act-warn ul { margin: 8px 0 0 0; padding-left: 18px; line-height: 1.8; }

.act-rewards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.act-reward { padding: 16px; border-radius: 14px; border: 1px solid var(--glass-border);
  background: linear-gradient(160deg, rgba(var(--accent-rgb), 0.1), transparent 70%); }
.act-reward__tier { font-family: var(--font-display); font-weight: 700; font-size: 15px; color: var(--neon-gold); }
.act-reward__cond { font-size: 13px; color: var(--text-mid); margin-top: 6px; line-height: 1.7; }
.act-reward__gift { font-size: 13px; color: var(--text-hi); margin-top: 8px; }

.act-code { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 14px; }
.act-code__val { padding: 10px 18px; border-radius: 10px; font-family: var(--font-display); font-size: 18px;
  font-weight: 700; letter-spacing: 0.12em; color: var(--neon-cyan);
  background: rgba(var(--accent2-rgb), 0.12); border: 1px dashed rgba(var(--accent2-rgb), 0.45); }

.act-platforms { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; position: relative; z-index: 1; }
.act-platform { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.act-platform__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.act-platform__name { font-family: var(--font-display); font-weight: 700; font-size: 16px; }
.act-platform__link { font-size: 11px; color: var(--text-low); border: 1px solid var(--glass-border);
  border-radius: 999px; padding: 3px 10px; }
.act-platform__meta { margin: 0; font-size: 13px; line-height: 1.7; }
.act-platform__meta > div { display: flex; gap: 8px; margin-bottom: 4px; }
.act-platform__meta dt { flex: 0 0 62px; color: var(--text-low); }
.act-platform__meta dd { margin: 0; color: var(--text-mid); }
.act-platform__meta .is-danger { color: #fb7185; }
.act-platform__tpl { border-radius: 12px; padding: 12px 14px; background: rgba(var(--bg-0-rgb), 0.45);
  border: 1px solid var(--glass-border); }
.act-platform__tpl-title { font-size: 14px; font-weight: 700; margin-bottom: 6px; }
.act-platform__tpl-body { margin: 0; font-family: inherit; font-size: 13px; line-height: 1.8;
  color: var(--text-mid); white-space: pre-wrap; word-break: break-word; }
.act-platform__tpl-tags { margin-top: 8px; font-size: 12px; color: var(--neon-cyan); }
.act-platform__copy { align-self: flex-start; }

.act-materials { display: flex; flex-direction: column; gap: 10px; }
.act-material { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px;
  border: 1px solid var(--glass-border); transition: border-color 0.2s ease; }
.act-material:hover { border-color: var(--accent-gold); }
.act-material__name { font-size: 14px; font-weight: 600; }
.act-material__note { font-size: 12px; color: var(--text-low); flex: 1; }
.act-material__dl { font-size: 12px; color: var(--neon-cyan); }

.act-submit { margin-top: 14px; font-size: 16px; padding: 13px 28px; }

.act-board__time { font-size: 12px; font-weight: 400; color: var(--text-low); margin-left: 8px; }
.act-board { display: flex; flex-direction: column; gap: 8px; }
.act-board__row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.06); font-size: 13px; }
.act-board__rank { font-family: var(--font-display); font-weight: 700; color: var(--neon-gold); width: 26px; }
.act-board__nick { font-weight: 600; }
.act-board__plat { color: var(--text-mid); }
.act-board__works { color: var(--text-mid); }
.act-board__reward { margin-left: auto; color: var(--text-hi); }

.act-foot { color: var(--text-low); font-size: 13px; margin: 6px 0 40px; position: relative; z-index: 1; }
.act-foot a { color: var(--neon-cyan); }

@media (max-width: 768px) {
  .page-hero { padding: 40px 0 20px; }
  .page-hero__title { font-size: 24px; }
  .act-block { padding: 20px 18px; }
  .act-rewards { grid-template-columns: 1fr; }
  .act-platforms { grid-template-columns: 1fr; }
  .act-code { flex-direction: column; align-items: stretch; }
  .act-code__val { text-align: center; }
  .act-board__row { flex-wrap: wrap; }
  .act-board__reward { margin-left: 0; width: 100%; }
}
</style>
