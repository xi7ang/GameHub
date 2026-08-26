<template>
  <div class="disclaimer-page">
    <SiteHeader />
    <BgWall />
    <section class="page-hero">
      <div class="container">
        <h1 class="page-hero__title">📜 免责声明</h1>
      </div>
    </section>

    <section class="container">
      <div class="content glass">
        <h3>1. 资源性质</h3>
        <p>本站所有资源均来源于网络公开渠道，仅用于个人学习、研究和技术交流，<strong>严禁用于商业用途</strong>。请在下载后 24 小时内删除。</p>

        <h3>2. 版权声明</h3>
        <p>本站所有资源的版权归原作者/公司所有。游戏、软件及相关素材的著作权归其权利人所有。本站不存储任何受版权保护的文件本体，仅提供网络分享链接的聚合索引。</p>

        <h3>3. 支持正版</h3>
        <p>我们强烈建议您在体验后购买正版游戏，支持开发者持续创作。正版购买渠道：Steam、Epic、任天堂 eShop、PlayStation Store、Xbox 商店及各平台官方渠道。</p>

        <h3>4. 侵权处理</h3>
        <p>如果您是版权所有者，认为本站内容侵犯了您的合法权益，请通过邮件 <a :href="'mailto:' + site?.email">{{ site?.email }}</a> 联系我们，我们将在核实后 <strong>48 小时内删除</strong> 相关内容。</p>

        <h3>5. 链接风险</h3>
        <p>本站资源链接均指向第三方网盘（夸克/UC/迅雷/百度/阿里），第三方平台的内容与行为本站无法控制。使用过程中请注意网络安全，警惕钓鱼链接，不透露个人敏感信息。</p>

        <h3>6. 使用责任</h3>
        <p>用户因使用本站资源产生的任何直接或间接损失，本站不承担任何法律责任。使用本站即视为同意本声明全部条款。</p>
      </div>
    </section>

    <SiteFooter />
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import SiteHeader from '../components/SiteHeader.vue'
import BgWall from '../components/BgWall.vue'
import SiteFooter from '../components/SiteFooter.vue'
import { useData } from '../composables/useData.js'

const { state, load } = useData()
const site = computed(() => state.site)
onMounted(load)
</script>

<style scoped>
.page-hero { padding: 56px 0 26px; position: relative; z-index: 1; }
.page-hero__title { font-family: var(--font-display); font-size: 32px; font-weight: 700; }
.content { padding: 34px 40px; position: relative; z-index: 1; max-width: 860px; }
.content h3 { margin: 22px 0 8px; font-size: 17px; color: var(--neon-cyan); }
.content h3:first-child { margin-top: 0; }
.content p { color: var(--text-mid); font-size: 14px; line-height: 1.9; }
.content a { color: var(--neon-cyan); }
</style>
