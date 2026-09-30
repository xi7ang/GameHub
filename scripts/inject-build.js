// scripts/inject-build.js
// 构建后把「构建期常量」写进 dist：
//   1) 品牌名：<title>/<meta> 里的默认品牌（GameHub）直接换成 site.json 的 brand.name，页签首帧即正确；
//   2) window.__BRAND__ / window.__BRAND_ACCENT__：useBrand() 首帧读它，logo 不再先渲染 GameHub 再换名；
//   3) window.__BUILD_ID__ + dist/version.json：运行时比对构建号，部署后自动切新版本（src/lib/version.js）；
//   4) home.json 的 preload 补上同一个 ?v=，让预载 URL 和实际 fetch 命中同一个缓存条目。
// 品牌与构建号都是构建期常量：改 site.json / push 代码 → CI 重建，两边自动同步。
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = resolve(root, 'dist')
const DEFAULT_BRAND = 'GameHub'

const site = JSON.parse(readFileSync(resolve(root, 'public/data/site.json'), 'utf8'))
const name = site?.brand?.name || site?.siteName || DEFAULT_BRAND
const accent = site?.brand?.accent ?? ''

function gitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch (e) {
    return 'nogit'
  }
}

// 构建号必须每次部署都不同：sha 相同（重跑 workflow）时靠时间戳兜底
const sha = (process.env.GITHUB_SHA || '').slice(0, 7) || gitSha()
const version = `${sha}.${Date.now().toString(36)}`

const marker = '<script>window.__BRAND__'
const inject =
  `<script>window.__BRAND__=${JSON.stringify(name)};` +
  `window.__BRAND_ACCENT__=${JSON.stringify(accent)};` +
  `window.__BUILD_ID__=${JSON.stringify(version)}</script>`

// 5) 百度统计：装在所有 dist/*.html 的 <head> 开头，等价于「页头模板一处安装、全站皆有」。
// 同步异步加载，PC/移动通用。改统计站点 ID 只改这里，页面上别另贴一份（会双报）。
const analyticsMarker = 'hm.baidu.com/hm.js'
const analytics = `<script>
var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?f6fb0535dda4b5acb96ed0b882d149d1";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();
</script>`

// 6) 百度站点验证 meta：同样装在所有 dist/*.html 的 <head>，一处安装全站生效。
// 换验证码只改这里；页面上另贴一份不会更"有效"，只会让两处失同步。
const verifyMarker = 'baidu-site-verification'
const verifyMeta = '<meta name="baidu-site-verification" content="codeva-zXlmKTo2DN" />'

// 7) Umami 自建统计（ECS stats.mibear.top，PG 存储）。
// data-website-id 是构建期常量：换站点只改这里；页面里别另贴一份 script（会双报）。
// 自定义事件在 src/pages/Resource.vue：详情页 view:<资源id>、「一键获取」get:<资源id>，
// 两者都用资源 id 当事件名，聚合侧 join 出来就是每资源的 点击率 = get / view。
const umamiMarker = 'stats.mibear.top/script.js'
const umami = '<script defer src="https://stats.mibear.top/script.js" data-website-id="fca1c103-0e59-4e95-970b-d0b44f38cf79"></script>'

let n = 0
for (const f of readdirSync(DIST).filter((f) => f.endsWith('.html'))) {
  const p = resolve(DIST, f)
  let html = readFileSync(p, 'utf8')
  let changed = false
  if (!html.includes(marker)) {
    // 幂等：重复 postbuild 不叠加
    html = html.split(DEFAULT_BRAND).join(name)
    html = html.replace(/href="\/data\/home\.json"/, `href="/data/home.json?v=${version}"`)
    html = html.replace(/<head>/, `<head>\n  ${inject}`)
    changed = true
  }
  if (!html.includes(analyticsMarker)) {
    html = html.replace(/<head>/, `<head>\n${analytics}`)
    changed = true
  }
  if (!html.includes(verifyMarker)) {
    html = html.replace(/<head>/, `<head>\n  ${verifyMeta}`)
    changed = true
  }
  if (!html.includes(umamiMarker)) {
    html = html.replace(/<head>/, `<head>\n  ${umami}`)
    changed = true
  }
  if (changed) {
    writeFileSync(p, html)
    n++
  }
}

writeFileSync(
  resolve(DIST, 'version.json'),
  JSON.stringify({ version, sha, builtAt: new Date().toISOString(), brand: name }, null, 2) + '\n'
)

console.log(
  `✅ 构建产物注入：品牌 ${name}${accent ? `（高亮 ${accent}）` : ''}，构建号 ${version} → dist/*.html（${n} 个）+ version.json`
)
