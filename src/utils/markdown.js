import { marked } from 'marked'

// 配置 marked
marked.setOptions({
  breaks: true, // 支持换行
  gfm: true,    // 支持 GitHub 风格 Markdown
})

/**
 * 将 Markdown 文本解析为 HTML
 * 内容来源为 AI 生成或用户手动输入，均存储在本地 IndexedDB
 * 如需更高安全性可引入 DOMPurify 进行 sanitize
 */
export function renderMarkdown(md) {
  if (!md) return ''
  return marked.parse(md)
}
