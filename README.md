# 🎮 GameHub 游戏资源库

全网游戏资源聚合分享站 · 单机 / 手游 / Switch / 联机 / MOD / 模拟器 / 游戏工具
部署于 GitHub Pages，数据即仓库，commit 即更新。

**线上地址：** https://xi7ang.github.io/GameHub/
**管理后台：** https://xi7ang.github.io/GameHub/admin.html

## ✨ 功能

- 🔍 资源搜索（首页即时下拉 + 搜索页，`/` 快捷键聚焦）
- 🗂️ 8 大分类 + 月度归档 + 平台/排序筛选
- 📄 资源详情：平台识别、提取码复制、二维码、跳转下载
- 📡 更新日志（git commit 自动生成）
- 🎨 暗色赛博游戏风：Canvas 粒子星云 + 封面墙 + 霓虹渐变
- 🔐 管理后台：资源/分类/站点配置 CRUD + 批量导入 + 一键部署

## 🚀 本地开发

```bash
npm install
npm run dev      # 开发预览
npm run build    # 构建到 dist/
npm run validate # 数据校验
```

## 📦 数据更新（三选一）

1. **后台操作**：访问 `/admin.html`，PAT 登录后增删改资源 → 提交 → 自动部署
2. **直接改 JSON**：编辑 `public/data/resources.json` → push → CI 自动构建部署
3. **批量粘贴**：后台"批量导入"页，粘贴 `标题 | 链接?pwd=` 多行文本自动解析

### 资源 schema（ISO 8601 时间精确到秒）

```json
{
  "id": "pc-202608-0001",
  "title": "游戏名",
  "enTitle": "English Name",
  "category": "pc",
  "tags": ["动作", "联机", "中文"],
  "platform": "quark",
  "url": "https://pan.quark.cn/s/xxx?pwd=wQTF",
  "pwd": "wQTF",
  "size": "12.5GB",
  "sizeBytes": 13421772800,
  "cover": "",
  "desc": "豪华中文版 解压即玩",
  "status": "active",
  "featured": false,
  "addedAt": "2026-08-25T10:00:00+08:00",
  "updatedAt": "2026-08-25T10:00:00+08:00",
  "month": "202608"
}
```

### 分类配置

编辑 `public/data/categories.json`：key / name / emoji / gradient（2 色渐变）/ order / show

### 站点配置

编辑 `public/data/site.json`：站点名、公告、QQ群/Telegram、邮箱、页脚、平台文案、热门关键词

## 🔐 管理后台安全须知

- 后台登录使用 GitHub **细粒度 PAT**，权限最小化：仅本仓库 `Contents: Read and write` + `Actions: Read and write`
- Token 只存浏览器 sessionStorage，关闭页面自动清除，绝不写入仓库
- 前端鉴权是"门锁"不是"保险柜"——PAT 泄露等于仓库写权限，请定期轮换
- 每次后台操作 = 一次 git commit，全量历史可回滚

## 🛠️ 技术栈

Vite 6 + Vue 3（MPA 多页，无路由库）· 原生 CSS 设计系统 · Canvas 粒子背景 · qrcode · GitHub Actions 自动部署

## 📄 免责声明

所有资源仅供学习交流，请支持正版。版权问题请联系删除。
