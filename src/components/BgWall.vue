<template>
  <!-- 全页背景：游戏封面墙（搬运自 xi7ang.github.io HomepageHero 成熟实现） -->
  <div class="bg-wall" aria-hidden="true">
    <div class="game-wall">
      <div class="game-wall__track">
        <template v-for="(row, ri) in gameRows" :key="ri">
          <div
            class="game-wall__row"
            :class="ri % 2 === 0 ? 'scroll-left' : 'scroll-right'"
            :style="{ animationDuration: rowSpeed + 's', marginLeft: rowMargin(ri) }"
          >
            <div
              v-for="(game, gi) in [...row, ...row]"
              :key="'t' + ri + '_' + gi"
              class="game-tile"
              :style="{ background: game.bg || '#2a475e' }"
            >
              <img
                v-if="game.img"
                :src="game.img"
                :alt="game.name"
                class="game-tile__img"
                loading="eager"
                decoding="async"
                fetchpriority="high"
                draggable="false"
              />
              <span v-else class="game-tile__name">{{ game.short }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>
    <!-- 遮罩（跟随主题） -->
    <div class="bg-wall__fade"></div>
  </div>
</template>

<script setup>
// ── 游戏封面墙数据（搬运自旧站 HomepageHero.vue）──
const BASE = import.meta.env.BASE_URL // '/'

const gameCovers = [
  { name: '反恐精英2', short: 'CS2', img: `${BASE}game-covers/cs2.jpg` },
  { name: 'DOTA2', short: 'DOTA2', img: `${BASE}game-covers/dota2.jpg` },
  { name: 'GTA5', short: 'GTA5', img: `${BASE}game-covers/gta5.jpg` },
  { name: 'Apex英雄', short: 'Apex', img: `${BASE}game-covers/apex.jpg` },
  { name: '星露谷物语', short: '星露谷', img: `${BASE}game-covers/stardew.jpg` },
  { name: '盖瑞模组', short: '盖瑞模组', img: `${BASE}game-covers/garrysmod.jpg` },
  { name: '无人深空', short: '无人深空', img: `${BASE}game-covers/nomansky.jpg` },
  { name: '求生之路2', short: '求生之路', img: `${BASE}game-covers/l4d2.jpg` },
  { name: '欧洲卡车模拟2', short: '欧卡2', img: `${BASE}game-covers/eurotruck.jpg` },
  { name: '骑马与砍杀2', short: '骑砍2', img: `${BASE}game-covers/mountblade.jpg` },
  { name: '僵尸毁灭工程', short: '僵毁', img: `${BASE}game-covers/projectzomboid.jpg` },
  { name: '环世界', short: '环世界', img: `${BASE}game-covers/rimworld.jpg` },
  { name: '壁纸引擎', short: '壁纸引擎', img: `${BASE}game-covers/wallpaperengine.jpg` },
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 18 行封面墙，每行独立洗牌；双份渲染实现无缝滚动
const gameRows = Array.from({ length: 18 }, () => shuffle(gameCovers))
const rowSpeed = 190

function rowMargin(ri) {
  return ri % 2 === 0 ? '-35px' : '35px'
}
</script>

<style scoped>
.bg-wall {
  position: fixed;
  inset: 0;
  z-index: -2;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  background: var(--wall-bg);
}

/* ── 封面墙（旧站原版结构）── */
.game-wall {
  position: absolute;
  inset: -10% -5%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 10px;
  transform: rotate(-3deg) scale(1.1);
}

.game-wall__track {
  display: flex;
  flex-direction: column;
  gap: 8px;
  will-change: transform;
  width: 100%;
  overflow: hidden;
}

.game-wall__row {
  display: flex;
  gap: 8px;
  width: max-content;
  will-change: transform;
}

.game-wall__row.scroll-left {
  animation: scroll-left 32s linear infinite;
}

.game-wall__row.scroll-right {
  animation: scroll-right 32s linear infinite;
}

@keyframes scroll-left {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@keyframes scroll-right {
  0% { transform: translateX(-50%); }
  100% { transform: translateX(0); }
}

.game-tile {
  width: 184px;
  height: 69px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.28;
  border: none;
  box-shadow: none;
  flex-shrink: 0;
  overflow: hidden;
}

.game-tile__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  -webkit-user-drag: none;
  user-drag: none;
  pointer-events: none;
}

.game-tile__name {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
  text-align: center;
  line-height: 1.2;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

/* ── 遮罩（跟随主题，避免旧站硬编码深色穿帮）── */
.bg-wall__fade {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    to bottom,
    rgba(var(--bg-0-rgb), 0.92) 0%,
    rgba(var(--bg-0-rgb), 0.3) 25%,
    rgba(var(--bg-0-rgb), 0.3) 75%,
    rgba(var(--bg-0-rgb), 0.92) 100%
  );
  pointer-events: none;
}
</style>
