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
        <span class="brand__name">
          <template v-if="parts.accent">{{ parts.main }}<span class="brand__accent">{{ parts.accent }}</span></template>
          <template v-else>{{ parts.main || site?.brand?.name || 'GameHub' }}</template>
        </span>
      </a>

      <nav class="site-nav">
        <a href="/" class="nav-link">首页</a>
        <a href="/category.html" class="nav-link">资源库</a>
        <!-- 更新日志入口已按要求隐藏（PC 端顶部导航） -->
        <!-- <a href="/changelog.html" class="nav-link">更新日志</a> -->
        <a v-if="site?.qqGroup" :href="site.qqGroup" target="_blank" rel="noreferrer" class="nav-cta nav-cta--qq"><img class="cta-icon" src="/qq-penguin.png" alt="" width="14" height="16" /><span class="cta-text">QQ群</span></a>
        <a v-if="site?.androidApp" :href="site.androidApp" class="nav-cta nav-cta--apk"><svg class="cta-icon" viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.46 11.46 0 0 0-8.94 0L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L6.4 9.48A10.98 10.98 0 0 0 1 18h22a10.98 10.98 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"/></svg><span class="cta-text">安卓APP</span></a>
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
import { useBrand } from '../composables/useBrand.js'
import { computed } from 'vue'

const { state } = useData()
const { theme, toggleTheme } = useTheme()
const site = computed(() => state.site)
const { brandParts } = useBrand()
const parts = computed(() => brandParts(site.value))
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
.nav-cta--qq { background: #366ef4; border-color: #2a5ce0; }
.nav-cta--qq .cta-icon { display: block; height: 16px; width: auto; }
.nav-cta--qq:hover { background: #2a5ce0; box-shadow: 0 0 12px rgba(54, 110, 244, 0.45); }

.nav-cta--apk { background: #3ddc84; border-color: #34c17a; color: #073042; animation: apk-glow 2.4s ease-in-out infinite; }
.nav-cta--apk:hover { background: #34c17a; box-shadow: 0 0 12px rgba(61, 220, 132, 0.45); }
@keyframes apk-glow {
  0%, 100% { box-shadow: 0 0 4px rgba(61, 220, 132, 0.25); }
  50% { box-shadow: 0 0 16px rgba(61, 220, 132, 0.65), 0 0 4px rgba(61, 220, 132, 0.4); }
}
/* 尊重系统的“减少动态”偏好 */
@media (prefers-reduced-motion: reduce) {
  .nav-cta--apk { animation: none; }
}
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
