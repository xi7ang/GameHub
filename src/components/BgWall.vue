<template>
  <!-- 全页背景：游戏胶囊图墙（Steam 胶囊图，默认 30 张，Admin 可一键随机刷新） -->
  <div class="bg-wall" aria-hidden="true">
    <div class="game-wall">
      <div class="game-wall__track">
        <template v-for="(row, ri) in gameRows" :key="ri">
          <div
            class="game-wall__row"
            :class="ri % 2 === 0 ? 'scroll-left' : 'scroll-right'"
            :style="{ '--row-speed': rowSpeed + 's', marginLeft: rowMargin(ri) }"
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
                loading="lazy"
                decoding="async"
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
import { ref, computed, onMounted } from 'vue'

const BASE = import.meta.env.BASE_URL

// 默认 30 张 Steam 胶囊图（兜底，加载 bgwall.json 时覆盖）
const DEFAULT_COVERS = [
  { slug: 'CS2', name: '反恐精英2', short: 'CS2', img: `${BASE}game-covers/CS2.webp` },
  { slug: 'Dota2', name: 'DOTA2', short: 'DOTA2', img: `${BASE}game-covers/Dota2.webp` },
  { slug: 'GTA5', name: 'GTA5', short: 'GTA5', img: `${BASE}game-covers/GTA5.webp` },
  { slug: 'Apex', name: 'Apex英雄', short: 'Apex', img: `${BASE}game-covers/Apex.webp` },
  { slug: 'Stardew', name: '星露谷物语', short: '星露谷', img: `${BASE}game-covers/Stardew.webp` },
  { slug: 'GMod', name: '盖瑞模组', short: 'GMod', img: `${BASE}game-covers/GMod.webp` },
  { slug: 'NoMansSky', name: '无人深空', short: '无人深空', img: `${BASE}game-covers/NoMansSky.webp` },
  { slug: 'L4D2', name: '求生之路2', short: 'L4D2', img: `${BASE}game-covers/L4D2.webp` },
  { slug: 'Witcher3', name: '巫师3', short: '巫师3', img: `${BASE}game-covers/Witcher3.webp` },
  { slug: 'EldenRing', name: '艾尔登法环', short: '法环', img: `${BASE}game-covers/EldenRing.webp` },
  { slug: 'Cyberpunk2077', name: '赛博朋克2077', short: '2077', img: `${BASE}game-covers/Cyberpunk2077.webp` },
  { slug: 'Sekiro', name: '只狼', short: '只狼', img: `${BASE}game-covers/Sekiro.webp` },
  { slug: 'RDR2', name: '荒野大镖客2', short: 'RDR2', img: `${BASE}game-covers/RDR2.webp` },
  { slug: 'BlackMythWukong', name: '黑神话悟空', short: '黑神话', img: `${BASE}game-covers/BlackMythWukong.webp` },
  { slug: 'HogwartsLegacy', name: '霍格沃茨之遗', short: '霍格沃茨', img: `${BASE}game-covers/HogwartsLegacy.webp` },
  { slug: 'ItTakesTwo', name: '双人成行', short: '双人成行', img: `${BASE}game-covers/ItTakesTwo.webp` },
  { slug: 'Raft', name: '木筏求生', short: 'Raft', img: `${BASE}game-covers/Raft.webp` },
  { slug: 'DontStarveTogether', name: '饥荒联机版', short: '饥荒联机', img: `${BASE}game-covers/DontStarveTogether.webp` },
  { slug: 'Rust', name: 'Rust腐蚀', short: 'Rust', img: `${BASE}game-covers/Rust.webp` },
  { slug: 'MonsterHunterWorld', name: '怪物猎人世界', short: '怪猎世界', img: `${BASE}game-covers/MonsterHunterWorld.webp` },
  { slug: 'Factorio', name: '异星工厂', short: 'Factorio', img: `${BASE}game-covers/Factorio.webp` },
  { slug: 'HifiRush', name: 'Hi-Fi RUSH', short: 'Hi-Fi', img: `${BASE}game-covers/HifiRush.webp` },
  { slug: 'Palworld', name: '幻兽帕鲁', short: '帕鲁', img: `${BASE}game-covers/Palworld.webp` },
  { slug: 'EuroTruck', name: '欧洲卡车模拟2', short: '欧卡2', img: `${BASE}game-covers/EuroTruck.webp` },
  { slug: 'MountBlade', name: '骑马与砍杀2', short: '骑砍2', img: `${BASE}game-covers/MountBlade.webp` },
  { slug: 'ProjectZomboid', name: '僵尸毁灭工程', short: '僵毁', img: `${BASE}game-covers/ProjectZomboid.webp` },
  { slug: 'RimWorld', name: '环世界', short: '环世界', img: `${BASE}game-covers/RimWorld.webp` },
  { slug: 'WallpaperEngine', name: '壁纸引擎', short: '壁纸引擎', img: `${BASE}game-covers/WallpaperEngine.webp` },
  { slug: 'TotalWar3K', name: '全面战争三国', short: '全战三国', img: `${BASE}game-covers/TotalWar3K.webp` },
  { slug: 'GodOfWar', name: '战神', short: '战神', img: `${BASE}game-covers/GodOfWar.webp` },
]

const gameCovers = ref([...DEFAULT_COVERS])

// 从 bgwall.json 加载配置（有则覆盖默认）
onMounted(async () => {
  try {
    const res = await fetch(`${BASE}data/bgwall.json`)
    if (!res.ok) return
    const data = await res.json()
    if (data.images && data.images.length) {
      // 用 bgwall.json 中的图片列表覆盖默认
      gameCovers.value = data.images.map(g => ({
        ...g,
        short: g.short || g.slug || g.name,
        img: g.img.startsWith('http') ? g.img : (g.img.startsWith(BASE) ? g.img : `${BASE}${g.img.replace(/^\/+/, '')}`),
      }))
    }
  } catch { /* 加载失败用默认列表 */ }
})

// 暴露刷新方法给父组件/全局调用
function shuffleCovers() {
  const arr = [...gameCovers.value]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  gameCovers.value = arr
}

// 使刷新方法全局可访问（Admin 后台通过 window.__bgwallRefresh() 调用）
if (typeof window !== 'undefined') {
  window.__bgwallRefresh = shuffleCovers
}

// 暴露给模板（通过 defineExpose 在 script setup 里也可用）
defineExpose({ refresh: shuffleCovers })

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 18 行封面墙，每行独立洗牌；双份渲染实现无缝滚动
const gameRows = computed(() => {
  const rows = []
  for (let i = 0; i < 18; i++) {
    rows.push(shuffle(gameCovers.value))
  }
  return rows
})
const rowSpeed = 500

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

/* 滚动时长单一来源：行内 --row-speed（由 rowSpeed 常量驱动），此处 var 兜底 */
.game-wall__row.scroll-left {
  animation: scroll-left var(--row-speed, 500s) linear infinite;
}

.game-wall__row.scroll-right {
  animation: scroll-right var(--row-speed, 500s) linear infinite;
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