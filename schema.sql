-- ===================================================
-- Interview Helper - D1 数据库建表语句
-- 使用方法: wrangler d1 execute interview-helper-db --file=schema.sql
-- ===================================================

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0
);

-- 面试问答表
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  dialog TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK(difficulty IN ('初级', '中级', '高级')),
  source TEXT DEFAULT '未知',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('approved', 'pending', 'rejected')),
  quality_score INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 登录失败记录表（防暴力破解）
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip);
