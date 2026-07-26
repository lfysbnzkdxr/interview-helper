# AI 面试备题工具

[在线使用](https://interview-helper-59v.pages.dev)

纯前端个人面试备题工具，支持随机练题、分类浏览、自定义题库、AI 优化问答。数据存储在浏览器本地（IndexedDB），无需注册登录，零后端零成本。

---

## 功能特性

| 功能 | 说明 |
|------|------|
| **随机练题** | 卡片式翻转练习，支持分类/难度筛选、键盘快捷键 |
| **分类浏览** | 按分类和难度浏览题库中的所有问答 |
| **创建问答** | 手动录入或 AI 优化，自动生成标准问答格式 |
| **题库管理** | 搜索、筛选、编辑、删除、隐藏、批量操作 |
| **多模型支持** | DeepSeek / GLM / OpenAI / Claude / Kimi / MiMo 自由配置 |
| **数据导入导出** | JSON 文件导出/导入，支持跨设备迁移 |
| **内置题库** | 预置 37 道 AI 方向面试题，开箱即用 |

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | Vue 3 (Composition API + `<script setup>`) |
| 构建工具 | Vite 5 |
| 样式方案 | Tailwind CSS 3 |
| 数据存储 | IndexedDB（idb 库） |
| AI 服务 | 用户自配 API Key（多提供商） |
| CORS 代理 | Cloudflare Workers（可选，给不支持 CORS 的 API 用） |
| 部署平台 | Cloudflare Pages（纯静态） |

## 快速开始

### 前置条件

- Node.js 18+
- npm

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

### 构建与部署

```bash
# 构建生产版本
npm run build

# 部署到 Cloudflare Pages（需配置 CLOUDFLARE_API_TOKEN）
npm run deploy
```

## 项目结构

```
interview-helper/
├── public/
│   ├── _redirects              # SPA 路由回退
│   └── vite.svg
├── src/
│   ├── components/
│   │   ├── AppHeader.vue       # 顶部导航
│   │   ├── browse/             # 分类浏览组件
│   │   └── practice/           # 练题卡片组件
│   ├── composables/
│   │   ├── useKeyboard.js      # 键盘快捷键
│   │   └── useQuestionQueue.js # 练题队列逻辑
│   ├── data/
│   │   └── seed-questions.json # 37 道内置种子题目
│   ├── router/index.js         # 路由配置
│   ├── services/
│   │   └── llm.js              # 多提供商 LLM 调用服务
│   ├── stores/
│   │   ├── db.js               # IndexedDB 初始化
│   │   └── useQuestionBank.js  # 题库 CRUD + 设置管理
│   ├── utils/
│   │   ├── helpers.js          # 通用工具函数
│   │   └── markdown.js         # Markdown 渲染
│   ├── views/
│   │   ├── PracticeView.vue    # 随机练题
│   │   ├── BrowseView.vue      # 分类浏览
│   │   ├── CreateView.vue      # 创建问答
│   │   ├── BankView.vue        # 题库管理
│   │   └── SettingsView.vue    # 设置（API/分类/数据）
│   ├── App.vue
│   ├── main.js
│   └── style.css
├── worker/
│   └── proxy.js                # 通用 CORS 代理 Worker
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## 使用说明

1. 首次访问自动导入 37 道内置题目
2. 在「设置」页添加 AI 提供商并填入 API Key
3. 在「创建问答」页录入题目和答案，可选择 AI 优化
4. 在「题库管理」页管理所有题目
5. 数据全部存储在浏览器 IndexedDB 中，清除浏览器数据会丢失
6. 可通过「设置 → 数据管理 → 导出」备份为 JSON 文件

## 开源协议

[MIT](LICENSE) © 2026 lfysbnzkdxr
