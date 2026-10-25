// src/composables/useTheme.js
// 深浅主题切换，默认黑暗模式，localStorage 记忆用户选择
import { ref } from 'vue'

const theme = ref(localStorage.getItem('gamehub-theme') || 'dark')

function apply(t) {
  theme.value = t
  document.documentElement.setAttribute('data-theme', t)
  localStorage.setItem('gamehub-theme', t)
}

function toggleTheme() {
  apply(theme.value === 'dark' ? 'light' : 'dark')
}

// 初始化
apply(theme.value)

export function useTheme() {
  return { theme, toggleTheme }
}
