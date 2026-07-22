# Interview Helper · AI 面经聚合平台

[在线体验](https://interview-helper-59v.pages.dev) | [项目文档](#) | [反馈问题](https://github.com/lfysbnzkdxr/interview-helper/issues)

AI 驱动的面试问答聚合平台，支持随机练题、分类浏览、AI 智能提交审核。

---

## 功能特性

| 功能 | 说明 |
|------|------|
| **随机练题** | 卡片式翻转练习，支持分类筛选、键盘快捷键操作 |
| **分类浏览** | 按 Agent / RAG / LLM / Python 分类浏览面试问答 |
| **AI 提交** | 用户提交问答后由 DeepSeek 自动判断难度、分类，并优化排版 |
| **自动审核** | 质量评分 ≥ 70 分自动上线，未达标进入待审核队列 |
| **缓存加速** | localStorage + Stale-While-Revalidate 缓存，刷新页面秒开 |
| **管理员审核** | JWT 认证登录后审核待提交内容 |

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | Vue 3 (Composition API) |
| 构建工具 | Vite 5 |
| 样式方案 | Tailwind CSS 3 |
| 后端引擎 | Cloudflare Pages Functions |
| 数据库 | Cloudflare D1 (SQLite) |
| AI 服务 | DeepSeek API (deepseek-chat) |
| 认证方案 | JWT (HS256, Web Crypto API) |
| 部署平台 | Cloudflare Pages |

## 快速开始

### 前置条件

- Node.js 18+
- npm / pnpm
- Cloudflare 账号（免费即可）
- DeepSeek API Key（[platform.deepseek.com](https://platform.deepseek.com) 获取）

### 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/lfysbnzkdxr/interview-helper.git
cd interview-helper

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

### 数据库初始化

```bash
# 创建 D1 数据库
npx wrangler d1 create interview-helper-db

# 复制 wrangler.toml.example 为 wrangler.toml，填入你的 D1 database_id

# 建表
npx wrangler d1 execute interview-helper-db --file=schema.sql
```

### 配置 Secrets

```bash
npx wrangler pages secret put DEEPSEEK_API_KEY
npx wrangler pages secret put JWT_SECRET
npx wrangler pages secret put ADMIN_USERNAME
npx wrangler pages secret put ADMIN_PASSWORD_HASH
```

> **注意**：`ADMIN_PASSWORD_HASH` 是密码的 SHA-256 十六进制摘要，可用以下命令生成：
> ```bash
> node -e "const crypto=require('crypto'); console.log(crypto.createHash('sha256').update('你的密码').digest('hex'))"
> ```

### 部署

```bash
npm run deploy
```

## 项目结构

```
interview-helper/
├── functions/                # Cloudflare Pages Functions（后端 API）
│   ├── api/
│   │   ├── login.js          # 管理员登录
│   │   ├── questions.js      # 获取题目列表
│   │   ├── submit.js         # 提交题目 + AI 处理
│   │   ├── pending.js        # 待审核列表
│   │   └── review.js         # 审核操作
│   └── utils/
│       └── auth.js           # JWT 工具模块
├── src/                      # 前端源码
│   ├── api/index.js          # API 封装层
│   ├── components/           # 组件
│   │   ├── browse/           # 分类浏览组件
│   │   └── practice/         # 练题组件
│   ├── composables/          # 组合式函数
│   ├── router/index.js       # 路由配置
│   ├── stores/               # 状态管理（缓存）
│   ├── utils/                # 工具函数
│   ├── views/                # 页面
│   │   ├── PracticeView.vue  # 随机练题
│   │   ├── BrowseView.vue    # 分类浏览
│   │   ├── SubmitView.vue    # 提交题目
│   │   └── ReviewView.vue    # 审核管理
│   ├── App.vue
│   └── main.js
├── wrangler.toml.example     # Cloudflare 配置模板
├── schema.sql                # 数据库建表语句
└── package.json
```

## 未来规划

- [ ] **用户注册登录** — 每位用户可查看自己的贡献记录
- [ ] **双路审核机制** — AI 评分 + 用户投票 + 管理员兜底
- [ ] **部署方案迁移** — 支持更多部署平台（Vercel / 自建）
- [ ] **题目内容扩充** — 社区贡献更多类别的面试问答

## 开源协议

[MIT](LICENSE) © 2026 lfysbnzkdxr
