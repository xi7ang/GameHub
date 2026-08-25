<template>
  <div class="changelog-page">
    <SiteHeader />
    <BgWall />
    <section class="page-hero">
      <div class="container">
        <h1 class="page-hero__title">📡 更新日志</h1>
        <p class="text-low">资源与功能更新记录，由 git commit 自动生成</p>
      </div>
    </section>

    <section class="container">
      <div v-if="state.loading" class="skeleton" style="height: 300px; border-radius: var(--radius)"></div>
      <div v-else-if="state.commits.length" class="log-list glass">
        <div v-for="c in state.commits" :key="c.hash" class="log-item">
          <div class="log-item__left">
            <span class="log-item__dot"></span>
          </div>
          <div class="log-item__body">
            <div class="log-item__msg">{{ c.message }}</div>
            <div class="log-item__meta text-low">
              {{ fmtFull(c.date) }} · <a :href="c.url" target="_blank" rel="noreferrer" class="log-item__hash">{{ c.hash }}</a>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty glass">
        <p>暂无更新记录</p>
      </div>
    </section>

    <SiteFooter />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'
import BgWall from '../components/BgWall.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { useData } from '../composables/useData.js'

const { state, load } = useData()

function fmtFull(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

onMounted(load)
</script>

<style scoped>
.page-hero { padding: 56px 0 26px; position: relative; z-index: 1; }
.page-hero__title { font-family: var(--font-display); font-size: 32px; font-weight: 700; margin-bottom: 6px; }
.log-list { padding: 22px 26px; position: relative; z-index: 1; }
.log-item { display: flex; gap: 16px; padding: 14px 0; border-bottom: 1px solid rgba(139, 92, 246, 0.08); }
.log-item:last-child { border-bottom: none; }
.log-item__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 6px;
  background: linear-gradient(135deg, var(--neon-purple), var(--neon-cyan));
  box-shadow: 0 0 10px rgba(139, 92, 246, 0.6);
}
.log-item__msg { font-size: 15px; }
.log-item__meta { font-size: 12px; margin-top: 4px; }
.log-item__hash { color: var(--neon-cyan); }
.empty { padding: 60px 20px; text-align: center; }
</style>
