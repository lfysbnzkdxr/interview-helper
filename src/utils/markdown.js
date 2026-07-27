import { marked } from 'marked'
import DOMPurify from 'dompurify'

// 配置 marked
marked.setOptions({
  breaks: true, // 支持换行
  gfm: true,    // 支持 GitHub 风格 Markdown
})

// Markdown 渲染缓存，避免重复解析
const cache = new Map()
const MAX_CACHE = 200

/**
 * 将 Markdown 文本解析为 HTML
 * 内容来源为 AI 生成或用户手动输入，均存储在本地 IndexedDB
 * 使用 DOMPurify 过滤 XSS（导入 JSON 可能包含恶意脚本）
 */
export function renderMarkdown(md) {
  if (!md) return ''
  if (cache.has(md)) return cache.get(md)
  const html = DOMPurify.sanitize(marked.parse(md))
  if (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value
    cache.delete(firstKey)
  }
  cache.set(md, html)
  return html
}
