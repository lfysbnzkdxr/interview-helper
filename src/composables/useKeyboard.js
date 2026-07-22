import { onMounted, onUnmounted } from 'vue'

/**
 * 键盘快捷键 composable
 * - ArrowLeft: 上一题
 * - ArrowRight: 下一题
 * - Space: 翻转卡片（阻止默认滚动）
 * 
 * 仅在非输入框聚焦时激活
 */
export function useKeyboard({ onPrev, onNext, onFlip }) {
  function handleKeydown(e) {
    // 排除输入框聚焦时的误触发
    const tag = e.target.tagName?.toUpperCase()
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) {
      return
    }

    switch (e.code) {
      case 'ArrowLeft':
        e.preventDefault()
        onPrev?.()
        break
      case 'ArrowRight':
        e.preventDefault()
        onNext?.()
        break
      case 'Space':
        e.preventDefault() // 阻止页面滚动
        onFlip?.()
        break
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
}
