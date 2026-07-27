import { ref } from 'vue'

const confirmState = ref(null) // { resolve, title, message, confirmText, cancelText, danger }
let pendingResolve = null

/**
 * Promise 化确认对话框 composable
 *
 * 用法：
 * const { confirm, ConfirmModalComponent } = useConfirm()
 * if (await confirm({ title: '确定删除？', message: '...', danger: true })) { ... }
 */
export function useConfirm() {
  function confirm(options = {}) {
    return new Promise((resolve) => {
      pendingResolve = resolve
      confirmState.value = {
        title: options.title || '确认',
        message: options.message || '',
        confirmText: options.confirmText || '确定',
        cancelText: options.cancelText || '取消',
        danger: options.danger || false,
      }
    })
  }

  function handleConfirm() {
    const resolve = pendingResolve
    pendingResolve = null
    confirmState.value = null
    resolve(true)
  }

  function handleCancel() {
    const resolve = pendingResolve
    pendingResolve = null
    confirmState.value = null
    resolve(false)
  }

  return {
    confirm,
    confirmState,
    handleConfirm,
    handleCancel,
  }
}
