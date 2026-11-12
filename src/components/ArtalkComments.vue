<!-- Artalk 评论（自托管，匿名可评）：每款资源 / 求助区各一个帖子 -->
<template>
  <div ref="boxRef" class="artalk-box"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Artalk from 'artalk'
import 'artalk/Artalk.css'
import { useTheme } from '../composables/useTheme.js'

const props = defineProps({
  // 帖子 key：详情页用资源 id（每款一个评论区），主页求助区用固定 key
  pageKey: { type: String, required: true },
  pageTitle: { type: String, default: '' },
})

const boxRef = ref(null)
const { theme } = useTheme()
let artalk = null

function init() {
  if (!boxRef.value) return
  artalk?.destroy()
  artalk = Artalk.init({
    el: boxRef.value,
    server: 'https://comments.mibear.top',
    site: '游戏源神',
    pageKey: props.pageKey,
    pageTitle: props.pageTitle,
    locale: 'zh-CN',
    darkMode: theme.value === 'dark',
  })
}

onMounted(init)
watch(() => props.pageKey, init)
watch(theme, (t) => artalk?.setDarkMode(t === 'dark'))
onBeforeUnmount(() => artalk?.destroy())
</script>

<style scoped>
.artalk-box {
  min-height: 120px;
}
</style>
