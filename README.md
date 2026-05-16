# MrWrite

> 任意终端输入 `mrwrite`，浏览器打开你的 AI 写作工作室。

MrWrite 是一个**本地优先、技能驱动的 AI 写作代理**。内核借鉴 Claude Code / OpenClaw 的架构哲学——技能在本地运行，前端只是可视化交互层。内置从 GitHub 高星项目提炼的写作技能，AI 会自动检测你的文字并推荐该用哪个技能。

## 为什么用 MrWrite

- **本地数据，你的密钥** — 作品以 Markdown 存本地文件系统，API Key 在你自己的 `.env` 里，零上传
- **技能自动调用** — AI 分析你的文字，自动推荐 humanizer（去 AI 味）、quality-gate（质量门禁）等技能，点一下即用
- **可插拔技能系统** — 用户自行安装/改装技能，复制文件夹就行，像给 Claude Code 装 skill
- **专业写作编辑器** — TipTap/ProseMirror 内核，Lora 衬线体排版，暖色调写作环境
- **任意厂商模型** — 兼容 OpenAI API 格式（OpenAI / Claude / DeepSeek / Ollama / 本地模型等）
- **一键导出** — Markdown → DOCX / PDF / EPUB / HTML / TXT

## 快速开始

### 环境要求

- **Node.js** >= 18
- **Pandoc**（可选，DOCX/PDF/EPUB 导出需要）

### 安装

```bash
git clone https://github.com/luluxiuc/Mrwrite.git
cd Mrwrite
npm install
npm link          # 注册全局 mrwrite 命令
```

配置 API Key：

```bash
cp .env.example .env
# 编辑 .env，填入你的大模型 API Key 和地址
```

```env
LLM_API_KEY=sk-your-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o
```

### 启动

```bash
mrwrite           # 任意终端输入，自动打开浏览器
```

```
MrWrite — AI Writing Studio
http://localhost:3000
```

也可以指定端口或静默启动：

```bash
mrwrite --port 3001
mrwrite --no-browser
```

## 技能系统

技能是 MrWrite 的核心。打开编辑器后，左侧 Skills 面板按写作阶段分组展示。**选中文字即可使用技能**。AI 会自动检测文本特征，推荐合适的技能（标示 ⚡AUTO）。

### 内置技能

| 技能 | 来源 | 功能 |
|------|------|------|
| **humanizer** ⚡ | de-ai-ify (47 模式) + Humanizer (7.2k★) | 去 AI 味，人味评分 0–100 |
| **outline-generator** | Writer's Loop + StoryCraftr | 层级化大纲生成 |
| **chapter-manager** | PlotPilot (611★) + Novel-OS | 章节结构 + 一致性追踪 |
| **style-transfer** | TinyStyler + EchoForge | 风格模仿与迁移 |
| **continuity-checker** | SAGA + Novel-OS Guardian | 跨章节一致性审计 |
| **quality-gate** | Novel-OS (5 门禁) + novel-creator-skill | 5 维度质量评分 |

⚡ = AI 自动建议启用的技能

### 工作原理

每个技能是一个文件夹，包含 `SKILL.md`（系统指令）和可选的代码文件：

```
~/.mrwrite/skills/
└── my-skill/
    ├── SKILL.md       # 元数据 + 系统指令（必需）
    ├── patterns.json   # 检测规则（可选）
    └── index.ts        # 执行代码（可选）
```

技能支持三种执行模式：
- **prompt** — 纯 Prompt 指令，靠 LLM 理解执行
- **code** — TypeScript 代码实现，精准可控
- **hybrid** — 代码预处理 + LLM 改写（humanizer 就是这个模式）

### 装技能

把技能文件夹复制到 `~/.mrwrite/skills/` 即可，无需重启。来自 GitHub 社区的写作技能直接丢进去就能用。

```bash
# 从 GitHub 下载社区技能
cd ~/.mrwrite/skills
git clone <skill-repo-url> my-skill
```

## 架构

```
CLI (mrwrite)
  → Next.js 14 服务端 (API Routes)
    → 技能引擎 (加载 SKILL.md → 构建 System Prompt → 流式 LLM 调用)
      → OpenAI 兼容 API → 用户自己的大模型
    → 数据层 (本地 Markdown 文件 + SQLite 元数据)
```

前端是三栏布局：
- **左侧**：文档列表 + 技能面板（Skills）
- **中间**：TipTap 写作编辑器
- **右侧**：AI 对话助手 + 技能执行结果

侧栏可折叠，面板可拖拽调节大小。

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 14 (App Router) |
| 编辑器 | TipTap (ProseMirror) |
| 样式 | Tailwind CSS + "Writer's Studio" 暖色调主题 |
| 字体 | DM Sans (界面) + Lora (编辑器) + JetBrains Mono (代码) |
| 数据库 | SQLite (sql.js WASM) |
| LLM | OpenAI 兼容 API |
| 导出 | Pandoc (DOCX/PDF/EPUB) + 前端 (HTML/TXT) |

## 项目结构

```
mrwrite/
├── cli/
│   └── mrwrite.js                 # 全局 CLI 入口
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── llm/route.ts       # LLM 代理
│   │   │   ├── skills/route.ts    # 技能列表 + 执行
│   │   │   ├── skills/auto-detect/ # 自动技能检测
│   │   │   ├── documents/         # 文档 CRUD
│   │   │   └── export/route.ts    # 多格式导出
│   │   ├── layout.tsx
│   │   └── page.tsx               # 主页面
│   ├── components/
│   │   ├── layout/                # 三栏布局
│   │   ├── editor/                # TipTap 编辑器 + 工具栏
│   │   ├── sidebar/               # 文档列表 + 技能栏
│   │   ├── agent/                 # AI 对话面板
│   │   └── settings/              # API 设置
│   ├── skills/
│   │   ├── types.ts               # 技能类型定义
│   │   ├── registry.ts            # 技能注册表 (从磁盘加载)
│   │   ├── engine.ts              # 技能执行引擎 (流式)
│   │   └── built-in/              # 6 个内置技能
│   └── lib/
│       ├── llm.ts                 # LLM 客户端
│       ├── db.ts                  # SQLite 数据库
│       ├── storage.ts             # 文件系统操作
│       └── pandoc.ts              # Pandoc 导出
├── docs/                          # 设计文档
└── tailwind.config.ts
```

## License

MIT
