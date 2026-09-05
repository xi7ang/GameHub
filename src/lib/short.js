// src/lib/short.js — 详情页短码（详情链接剪短）
// 短码 = FNV-1a 32bit hash(语义id) mod 36^6 → base36 6位；与 scripts 校验脚本同算法
export function shortId(id) {
  let h = 2166136261
  const s = String(id)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return (h % 2176782336).toString(36).padStart(6, '0')
}
// 详情链接（根路径部署后用，自动用短码；旧语义 id 仍可访问）
export function detailHref(id) {
  return `/resource.html?id=${shortId(id)}`
}
