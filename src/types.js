/**
 * 项目公共类型定义（纯 JSDoc，无运行时代码）
 * 供 IDE 智能提示和类型检查使用
 */

/**
 * @typedef {Object} Question
 * @property {string} id - UUID
 * @property {string} category - 所属分类
 * @property {string} question - 问题标题
 * @property {string} dialog - Markdown 格式的面试官-求职者对话
 * @property {'初级'|'中级'|'高级'} difficulty - 难度等级
 * @property {string} source - 来源（内置/AI生成/手动创建）
 * @property {boolean} builtIn - 是否为内置题目（不可删除只能隐藏）
 * @property {boolean} hidden - 是否隐藏
 * @property {number} createdAt - 创建时间戳
 * @property {number} updatedAt - 更新时间戳
 */

/**
 * @typedef {Object} ApiProvider
 * @property {string} id - 唯一标识
 * @property {string} name - 显示名称
 * @property {string} baseUrl - API 端点地址
 * @property {string} apiKey - API 密钥
 * @property {string} model - 模型名称
 * @property {'openai'|'anthropic'} apiFormat - API 协议格式
 * @property {boolean} [needsProxy] - 是否需要 CORS 代理
 * @property {string} [keyPlaceholder] - 输入框占位提示
 * @property {string[]} [models] - 可选模型列表
 * @property {number} [temperature] - 温度参数
 */

/**
 * @typedef {Object} ApiConfig
 * @property {ApiProvider[]} providers - 已配置的提供商列表
 * @property {string} activeId - 当前激活的提供商 id
 */

/**
 * @typedef {Object} LLMResult
 * @property {string} optimized_question - 优化后的问题标题
 * @property {string} dialog - 对话内容（Markdown）
 * @property {string} difficulty - 难度等级
 */

export {}
