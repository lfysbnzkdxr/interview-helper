# 贡献指南

感谢你考虑为 Interview Helper 贡献代码！

## 提交 Issue

- **Bug 报告**：请描述复现步骤、预期行为和实际行为
- **功能请求**：请说明使用场景和期望效果

## 提交 PR

1. 从 `dev` 分支创建你的 feature 分支：`git checkout -b feat/your-feature dev`
2. 提交前确保代码可以通过构建：`npm run build`
3. 提交 PR 到 `dev` 分支（**不要**提交到 `main`）

## 开发规范

- 前端遵循 Vue 3 Composition API + `<script setup>` 风格
- API 端点统一返回 JSON，使用 `jsonResponse` 工具函数
- 不要将 Secrets / API Key 提交到代码中
- wrangler.toml 不提交到版本控制，使用 `wrangler.toml.example` 作为模板
