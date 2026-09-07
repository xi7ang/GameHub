// src/composables/useBrand.js
// 品牌名解析：site.json 的 brand 配置 → 页面各处展示
// brand = { name: 'GameHub', accent: 'Hub' }（name 完整名，accent 可高亮后缀）
// 兼容旧数据：无 brand 字段时回退 siteName 首词，无 accent 则不拆高亮
import { useData } from './useData.js'

const LS_KEY = 'gamehub-brand'

export function useBrand() {
  const { state } = useData()

  // 完整品牌名：site 配置优先；数据未就绪时用 localStorage 记忆（后台保存过换名则首帧即新名）；
  // 都没有则默认 GameHub
  function brandName(site) {
    const s = site || state.site
    const b = s?.brand
    if (b?.name) return b.name
    if (s?.siteName) return String(s.siteName).split(/\s+/)[0]
    try { return localStorage.getItem(LS_KEY) || 'GameHub' } catch (e) { return 'GameHub' }
  }

  // 高亮后缀（无则空串 = 不拆分）。localStorage 只记了整名，拆分信息仅在 site 就绪后可用。
  function brandAccent(site) {
    const s = site || state.site
    const b = s?.brand
    return (b && b.accent != null) ? b.accent : ''
  }

  // 头部/底部展示用：主词 + 高亮段（main/accent 各可能为空，模板自行 v-if）
  function brandParts(site) {
    const name = brandName(site)
    const accent = brandAccent(site)
    if (!accent) return { main: name, accent: '' }
    // accent 必须在 name 里出现才拆分，否则整名当主词（避免换了品牌名忘了换 accent 导致错乱）
    const idx = name.indexOf(accent)
    if (idx < 0) return { main: name, accent: '' }
    return { main: name.slice(0, idx), accent: name.slice(idx) }
  }

  // 页面 <title> 文案
  function pageTitle(site, suffix) {
    const s = site || state.site
    if (s?.siteName) {
      return suffix ? `${suffix} - ${s.siteName}` : s.siteName
    }
    return suffix ? `${suffix} - ${brandName(s)}` : brandName(s)
  }

  return { brandName, brandAccent, brandParts, pageTitle }
}
