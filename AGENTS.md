# AGENTS.md

This file provides guidance to Lingma (lingma.aliyun.com) when working with code in this repository.

## Commands

```bash
npm run dev          # 启动开发服务器 (localhost:5173, strictPort, HMR已禁用)
npm run build        # 生产构建 → dist/
npm run preview      # 预览生产构建
npm run deploy       # 构建 + 部署到 Cloudflare Pages (需 CLOUDFLARE_API_TOKEN 环境变量)
```

无 lint、无测试框架。项目无 CI。

部署外置 CORS 代理 Worker（可选）：
```bash
node "C:\Users\Lfy\AppData\Roaming\npm\node_modules\wrangler\bin\wrangler.js" deploy worker/proxy.js --name ih-llm-proxy --compatibility-date 2024-01-01
```

## Architecture

纯前端个人面试备题工具。Vue 3 (Composition API + `<script setup>`) + Vite 5 + Tailwind CSS 3。数据全部存浏览器 IndexedDB（idb 库），无后端数据库，无用户认证。

### 状态管理

**不使用 Pinia/Vuex**。共享状态通过模块级 `ref()` 在 composable 中实现跨组件共享：

- `src/stores/useQuestionBank.js` — 核心 store，模块级 `questions`/`categories`/`loaded` ref。所有组件调用 `useQuestionBank()` 共享同一份数据。提供题目 CRUD、设置读写、数据导入导出、云迁移全部逻辑。
- `src/stores/db.js` — IndexedDB 初始化（单例 Promise 模式）。两个 object store：`questions`（keyPath: id, 索引: category/difficulty/builtIn）和 `settings`（keyPath: key）。首次访问自动导入 `seed-questions.json`。

### 数据模型

题目对象：`{ id, category, question, dialog, difficulty, source, builtIn, hidden, createdAt, updatedAt }`

- `dialog` 是 Markdown 格式的面试官-求职者对话内容（非纯文本答案）
- `builtIn: true` 的题目不可删除只能隐藏（`hidden: true`）
- 设置以 key-value 存于 settings store：`categories`（字符串数组）、`apiConfig`（`{ providers: [], activeId }`）、`initialized`

### LLM 多提供商架构

`src/services/llm.js` 实现双格式抽象：

- **OpenAI 兼容格式**（DeepSeek/GLM/Kimi/通义千问/MiMo）和 **Anthropic 格式**
- 预设提供商在 `PROVIDER_PRESETS` 数组中定义，含 `needsProxy` 标记
- CORS 路由决策：`shouldUseProxy()` 检查 `needsProxy` 或域名是否在 CORS 友好列表。需要代理时请求走同域 `/api/llm-proxy`（Pages Function），否则直连
- 代理通过请求头传参：`X-Target-Url`（目标地址）、`X-Api-Key`（密钥）、`X-Api-Format`（openai/anthropic）

### 服务端（Cloudflare Pages Functions）

`functions/api/` 目录下的文件自动映射为 API 路由：

- `llm-proxy.js` → `POST /api/llm-proxy`：LLM 转发代理，有域名白名单 `ALLOWED_HOSTS`（新增提供商需同时更新此处和 `worker/proxy.js`）
- `sync.js` → `GET/PUT /api/sync`：云迁移同步码，使用 KV 存储（binding: `SYNC_DATA`），TTL 仅允许 600s 或 86400s

`worker/proxy.js` 是独立部署的 Cloudflare Worker（外置代理），白名单需与 `functions/api/llm-proxy.js` 保持同步。

### 本地开发代理

`vite.config.js` 将 `/api` 代理到生产环境 `https://interview-helper-59v.pages.dev`，本地开发时 Pages Functions 不可用，通过此代理访问线上接口。

### 关键约束

- **IndexedDB 不能存 Vue Proxy 对象**：写入前必须 `JSON.parse(JSON.stringify())` 或展开为纯对象/数组
- Vite HMR 已禁用（`hmr: false`），修改代码需手动刷新
- 部署命令必须带 `--branch main`，项目名为 `interview-helper`
- 项目为私有仓库，`seed-questions.json` 是核心知识资产
