# 我的面试题库

[在线使用](https://interview-helper-59v.pages.dev)

纯前端个人面试备题工具，支持随机练题、分类浏览、自定义题库、AI 优化问答。数据存储在浏览器本地（IndexedDB），无需注册登录，零后端零成本。

## 使用说明

1. 打开 [在线地址](https://interview-helper-59v.pages.dev)，首次访问自动导入 37 道内置题目，开箱即用
2. 进入「练习模式」开始随机刷题，支持按分类/难度筛选，键盘 ← → 翻题、空格翻转卡片
3. 需要 AI 辅助时，在「设置 → API 配置」中添加提供商并填入你的 API Key（支持 DeepSeek / GLM / Kimi / 通义千问等）
4. 在「创建问答」页录入自己的题目，可让 AI 生成标准对话格式答案或优化已有答案
5. 在「题库管理」页搜索、编辑、隐藏、删除题目，支持批量操作
6. 数据全部存在浏览器本地，建议定期在「设置 → 数据管理」导出 JSON 备份
7. 换设备时在「设置 → 云迁移」生成同步码，在新设备输入即可恢复（支持覆盖/合并）

---

## 功能特性

| 功能 | 说明 |
|------|------|
| **随机练题** | 卡片式翻转练习，支持分类/难度筛选、键盘快捷键 |
| **分类浏览** | 按分类和难度浏览题库中的所有问答 |
| **创建问答** | 手动录入或 AI 优化，自动生成标准问答格式 |
| **题库管理** | 搜索、筛选、编辑、删除、隐藏、批量操作 |
| **多模型支持** | DeepSeek / GLM / Kimi / 通义千问 / MiMo 预设，支持自定义提供商 |
| **数据导入导出** | JSON 文件导出/导入，支持覆盖或合并 |
| **云迁移** | 生成临时同步码，跨设备零登录迁移数据（10分钟/24小时过期） |
| **内置题库** | 预置 37 道 AI 方向面试题，开箱即用 |

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | Vue 3 (Composition API + `<script setup>`) |
| 构建工具 | Vite 5 |
| 样式方案 | Tailwind CSS 3 |
| 数据存储 | IndexedDB（idb 库） |
| AI 服务 | 用户自配 API Key（多提供商预设 + 自定义） |
| 内置代理 | Cloudflare Pages Functions（LLM 代理 + KV 同步） |
| 外置代理 | Cloudflare Workers（可选，给不支持 CORS 的 API 用） |
| 部署平台 | Cloudflare Pages（静态前端 + Functions） |

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
│   │   ├── llm.js              # 多提供商 LLM 调用服务
│   │   └── cloud-sync.js       # 云迁移同步码服务
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
├── functions/api/
│   ├── llm-proxy.js            # LLM API 内置代理（Pages Function）
│   └── sync.js                 # 云迁移同步接口（KV 存储）
├── worker/
│   └── proxy.js                # LLM API CORS 代理 Worker（外置可选）
├── wrangler.toml               # Cloudflare KV 绑定配置
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## 开源协议

[MIT](LICENSE) © 2026 lfysbnzkdxr
