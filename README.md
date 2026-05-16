# MrWrite

> 终端输入 `mrwrite`，浏览器打开你的个人写作工作室。

MrWrite 是一个**本地优先、技能驱动的 AI 写作代理**。它将 Claude Code 式的技能系统与专业写作编辑器融合，让你在自己的电脑上享受 AI 辅助写作。

## 为什么选择 MrWrite

- **本地优先** — 数据存在你的硬盘上，API Key 在你的 `.env` 里，不上传任何第三方
- **技能可插拔** — 内置去 AI 味、大纲规划、风格迁移等写作技能，支持自行安装/改装
- **专业编辑器** — 基于 TipTap/ProseMirror 的长文写作编辑器，支持章节管理、专注模式
- **多模型支持** — 兼容 OpenAI API 格式的所有大模型（OpenAI / Claude / DeepSeek / 本地模型等）
- **一键导出** — Markdown → DOCX / PDF / EPUB / HTML，基于 Pandoc

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9
- Pandoc（导出功能需要，[安装指南](https://pandoc.org/installing.html)）

### 安装

```bash
# 克隆仓库
git clone https://github.com/luluxiuc/Mrwrite.git
cd Mrwrite

# 安装依赖
npm install

# 配置 API Key
cp .env.example .env
# 编辑 .env 填入你的大模型 API Key

# 启动
npm run mrwrite
```

启动后会自动打开浏览器进入写作界面。

### CLI 命令

```bash
mrwrite              # 启动写作工作室
mrwrite --port 3001  # 指定端口
mrwrite --no-browser # 不自动打开浏览器
```

## 技能系统

MrWrite 的核心是**可插拔的技能系统**。技能决定了 AI 如何辅助你写作。

### 内置技能

| 技能 | 功能 |
|------|------|
| **humanizer** | 去除 AI 写作痕迹，让文字更自然（47 种 AI 模式检测） |
| **outline-generator** | 根据主题自动生成写作大纲 |
| **chapter-manager** | 长文章节管理，追踪剧情/论点一致性 |
| **style-transfer** | 学习并模仿特定写作文风 |
| **continuity-checker** | 检查前后文一致性（人物、时间线、情节） |
| **export-assistant** | 一键导出为目标格式 |

### 安装社区技能

```bash
# 从 GitHub 安装技能
mrwrite skill install <github-url>

# 从本地安装
mrwrite skill install ./my-skill

# 列出已安装技能
mrwrite skill list
```

### 自定义技能

在 `.mrwrite/skills/` 目录下创建你的技能文件夹：

```
.mrwrite/skills/my-skill/
├── SKILL.md       # 技能定义（必需）
└── data/          # 技能数据（可选）
```

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js 14 + React + TipTap + Tailwind CSS + shadcn/ui |
| 后端 | Next.js API Routes |
| 数据 | 本地文件系统 (Markdown) + SQLite |
| LLM | OpenAI 兼容 API（支持任意厂商） |
| 导出 | Pandoc + 前端导出 |
| UI 设计 | ui-ux-pro-max-skill |

## 项目结构

```
mrwrite/
├── src/
│   ├── app/           # Next.js App Router
│   │   ├── api/       # API 路由（LLM 代理、文档管理）
│   │   └── page.tsx   # 写作编辑器页面
│   ├── components/    # React 组件
│   │   ├── editor/    # TipTap 编辑器
│   │   ├── sidebar/   # 侧边栏（作品管理）
│   │   └── agent/     # AI 对话面板
│   ├── skills/        # 技能引擎
│   │   ├── core/      # 核心技能（代码实现）
│   │   ├── prompt/    # 指令技能（Prompt 定义）
│   │   └── engine.ts  # 技能执行引擎
│   └── lib/           # 工具函数
├── .claude/skills/    # Claude Code 技能
├── cli/               # CLI 启动脚本
└── data/              # 本地数据存储
```

## License

MIT

---

Made with ❤️ for writers who care about their tools.
