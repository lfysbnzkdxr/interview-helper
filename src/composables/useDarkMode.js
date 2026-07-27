import { ref, watch } from 'vue'

const STORAGE_KEY = 'darkMode'

// 模块级状态
const isDark = ref(localStorage.getItem(STORAGE_KEY) === 'true')

// 初始化时同步到 html
if (isDark.value) {
  document.documentElement.classList.add('dark')
} else {
  document.documentElement.classList.remove('dark')
}

export function useDarkMode() {
  function toggle() {
    isDark.value = !isDark.value
  }

  // 监听变化同步到 DOM 和 localStorage
  watch(isDark, (val) => {
    if (val) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem(STORAGE_KEY, val)
  })

  return {
    isDark,
    toggle,
  }
}
