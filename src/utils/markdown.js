import { marked } from 'marked'

// 配置 marked
marked.setOptions({
  breaks: true, // 支持换行
  gfm: true,    // 支持 GitHub 风格 Markdown
})

/**
 * 将 Markdown 文本解析为 HTML
 * 注意：当前 mock 数据为自有内容，无 XSS 风险
 * 后续接入外部 API 时需引入 DOMPurify 进行 sanitize
 */
export function renderMarkdown(md) {
  if (!md) return ''
  return marked.parse(md)
}
