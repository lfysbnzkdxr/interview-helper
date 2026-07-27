import { ref } from 'vue'

const toasts = ref([])
let nextId = 0

/**
 * Toast 消息提示 composable（模块级共享状态）
 * 支持多条消息叠加、自动消失、成功/错误/警告类型
 */
export function useToast() {
  function show(message, type = 'success', duration = 3000) {
    const id = ++nextId
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, duration)
  }

  return {
    toasts,
    show,
    success: (msg) => show(msg, 'success', 3000),
    error: (msg) => show(msg, 'error', 5000),
    warning: (msg) => show(msg, 'warning', 4000),
    info: (msg) => show(msg, 'info', 3000),
  }
}
