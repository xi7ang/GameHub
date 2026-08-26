<template>
  <header class="site-header">
    <div class="container site-header__inner">
      <a href="/GameHub/" class="brand">
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
        <a href="/GameHub/" class="nav-link">首页</a>
        <a href="/GameHub/category.html" class="nav-link">资源库</a>
        <a href="/GameHub/changelog.html" class="nav-link">更新日志</a>
        <a v-if="site?.qqGroup" :href="site.qqGroup" target="_blank" rel="noreferrer" class="nav-cta">💬 QQ群</a>
        <a v-if="site?.telegram" :href="site.telegram" target="_blank" rel="noreferrer" class="nav-cta nav-cta--tg">✈️ Telegram</a>
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
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid var(--glass-border);
  color: var(--text-hi);
  transition: all 0.2s;
}
.nav-cta:hover { border-color: var(--neon-purple); box-shadow: var(--shadow-glow); }
.nav-cta--tg { border-color: rgba(var(--accent2-rgb), 0.35); }
.nav-cta--tg:hover { border-color: var(--neon-cyan); }
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
  .brand__name { font-size: 19px; }
}
</style>
