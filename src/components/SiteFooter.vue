<template>
  <footer class="site-footer">
    <div class="container">
      <div class="site-footer__top">
        <div class="site-footer__brand">
          <div class="brand__name">Game<span class="brand__accent">Hub</span></div>
          <p class="text-low">{{ site?.slogan }}</p>
        </div>
        <div class="site-footer__links">
          <a href="/GameHub/">首页</a>
          <a href="/GameHub/category.html">资源库</a>
          <a href="/GameHub/changelog.html">更新日志</a>
          <a href="/GameHub/disclaimer.html">免责声明</a>
          <a v-if="site?.email" :href="'mailto:' + site.email">联系站长</a>
        </div>
      </div>
      <div class="site-footer__bottom text-low">
        <p>{{ site?.footer }}</p>
        <p>Copyright © {{ year }} GameHub · <span id="busuanzi_container_site_uv">访客 <span id="busuanzi_value_site_uv"></span></span> · <span id="busuanzi_container_site_pv">访问 <span id="busuanzi_value_site_pv"></span></span></p>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { useData } from '../composables/useData.js'
const { state } = useData()
const site = state.site
const year = new Date().getFullYear()
</script>

<style scoped>
.site-footer {
  margin-top: 60px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.12);
  background: rgba(var(--bg-0-rgb), 0.6);
  backdrop-filter: blur(12px);
  padding: 40px 0 24px;
}
.site-footer__top {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 24px;
  margin-bottom: 28px;
}
.brand__name {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
}
.brand__accent {
  background: linear-gradient(135deg, var(--neon-purple), var(--neon-cyan));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.site-footer__links {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.site-footer__links a { color: var(--text-mid); font-size: 14px; transition: color 0.2s; }
.site-footer__links a:hover { color: var(--neon-cyan); }
.site-footer__bottom {
  border-top: 1px solid rgba(var(--accent-rgb), 0.1);
  padding-top: 18px;
  font-size: 13px;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
