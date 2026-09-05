<template>
  <header class="site-header">
    <div class="container site-header__inner">
      <a href="/" class="brand">
        <span class="brand__logo">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
            <rect x="2" y="6" width="20" height="12" rx="3" stroke="currentColor" stroke-width="1.6"/>
            <circle cx="8.5" cy="12" r="1.3" fill="currentColor"/>
            <circle cx="15.5" cy="12" r="1.3" fill="currentColor"/>
            <path d="M5 3v3M19 3v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </span>
        <span class="brand__name">Game<span class="brand__accent">Hub</span></span>
      </a>

      <nav class="site-nav">
        <a href="/" class="nav-link">首页</a>
        <a href="/category.html" class="nav-link">资源库</a>
        <a href="/changelog.html" class="nav-link">更新日志</a>
        <a v-if="site?.qqGroup" :href="site.qqGroup" target="_blank" rel="noreferrer" class="nav-cta nav-cta--qq"><span class="cta-icon">🐧</span><span class="cta-text">QQ群</span></a>
        <a v-if="site?.telegram" :href="site.telegram" target="_blank" rel="noreferrer" class="nav-cta nav-cta--tg"><svg class="cta-icon" viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M21.9 3.6c.3-1.2-.9-2.2-2-1.7L2.7 9.8c-1.2.5-1.1 2.2.1 2.6l4.8 1.6 1.8 5.7c.4 1.1 1.8 1.4 2.6.6l2.5-2.5 4.7 3.5c1 .7 2.4.2 2.7-1l2.9-16.7zM9 14.2l8.5-6.9c.3-.2.6.2.4.5l-6.6 7.2c-.3.3-.8.4-1.2.3l-2.3-.8 1.2-.3z"/></svg><span class="cta-text">Telegram</span></a>
        <button class="theme-toggle" @click="toggleTheme" :title="theme === 'dark' ? '切换日间' : '切换夜间'">
          <span v-if="theme === 'dark'">☀️</span>
          <span v-else>🌙</span>
        </button>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { useData } from '../composables/useData.js'
import { useTheme } from '../composables/useTheme.js'
import { computed } from 'vue'

const { state } = useData()
const { theme, toggleTheme } = useTheme()
const site = computed(() => state.site)
</script>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(var(--bg-0-rgb), 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.12);
}
.site-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 62px;
}
.brand { display: flex; align-items: center; gap: 10px; }
.brand__logo { color: var(--neon-purple); display: flex; }
.brand__name {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.03em;
}
.brand__accent {
  background: linear-gradient(135deg, var(--neon-purple), var(--neon-cyan));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.site-nav { display: flex; align-items: center; gap: 6px; }
.nav-link {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-mid);
  transition: all 0.2s;
}
.nav-link:hover { color: var(--text-hi); background: rgba(var(--accent-rgb), 0.1); }
.nav-cta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  border: 1px solid transparent;
  transition: all 0.2s;
  white-space: nowrap;
}
.cta-icon { display: inline-flex; font-size: 13px; line-height: 1; }
.cta-text { line-height: 1; }
.nav-cta--qq { background: #07c160; border-color: #06ad56; }
.nav-cta--qq:hover { background: #06ad56; box-shadow: 0 0 12px rgba(7, 193, 96, 0.45); }
.nav-cta--tg { background: #1da1f2; border-color: #1a91da; }
.nav-cta--tg:hover { background: #1a91da; box-shadow: 0 0 12px rgba(29, 161, 242, 0.45); }
.theme-toggle {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--glass-border);
  background: transparent;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.theme-toggle:hover { border-color: var(--neon-purple); box-shadow: var(--shadow-glow); }

@media (max-width: 640px) {
  .nav-link { display: none; }
  .brand__name { font-size: 18px; }
  .site-header__inner { height: 56px; }
  .site-nav { gap: 4px; }
  .nav-cta { padding: 4px 9px; font-size: 11px; gap: 4px; }
  .cta-icon { font-size: 12px; }
  .theme-toggle { width: 32px; height: 32px; font-size: 14px; border-radius: 8px; }
}
@media (max-width: 400px) {
  .brand__name { font-size: 16px; }
  .nav-cta { padding: 3px 8px; font-size: 10.5px; }
}
</style>
