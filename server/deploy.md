# AI智能日历 - 后端部署指南

本文档详细说明如何将 Express + SQLite 后端部署到云端，使微信小程序能够访问。

---

## 目录

1. [部署方式对比](#部署方式对比)
2. [Railway 部署（推荐）](#railway-部署推荐)
3. [环境变量配置清单](#环境变量配置清单)
4. [数据库说明](#数据库说明)
5. [健康检查](#健康检查)
6. [HTTPS 配置](#https-配置)
7. [常见问题](#常见问题)

---

## 部署方式对比

| 平台 | 费用 | SQLite支持 | 难度 | 推荐度 |
|------|------|-----------|------|--------|
| **Railway** | 免费额度起 | ✅ 支持持久化存储 | ⭐ 简单 | ⭐⭐⭐⭐⭐ |
| Flynn.io | 免费额度 | ✅ 支持卷挂载 | ⭐⭐ 中等 | ⭐⭐⭐⭐ |
| 腾讯云轻量服务器 | 按量付费 | ✅ 完全控制 | ⭐⭐⭐ 较难 | ⭐⭐⭐ |
| Vercel | 免费 | ❌ 不可用（无持久化） | — | 不推荐 |

> **推荐 Railway**：Railway 支持持久化存储卷，SQLite 数据库文件不会因为容器重启而丢失，且部署操作非常简单。

---

## Railway 部署（推荐）

### 前提条件

- 一个 [GitHub](https://github.com) 账号
- 已将项目代码推送到 GitHub 仓库
- 一个 [Railway](https://railway.app) 账号（可用 GitHub 直接登录）

### 步骤 1：准备代码仓库

确保你的 GitHub 仓库包含以下文件结构：

```
your-repo/
├── server/
│   ├── src/
│   │   ├── index.js
│   │   ├── config.js
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── package.json
│   ├── package-lock.json
│   └── .env.example
```

### 步骤 2：在 Railway 中创建项目

1. 登录 [Railway Dashboard](https://railway.app/dashboard)
2. 点击 **"New Project"**
3. 选择 **"Deploy from GitHub repo"**
4. 授权 Railway 访问你的 GitHub 仓库
5. 选择你的项目仓库

### 步骤 3：配置服务

Railway 会自动检测 `package.json`，但需要手动设置以下内容：

**a) 设置根目录**

在项目设置中，将 **Root Directory** 设置为：
```
server
```

**b) 设置启动命令**

在 **Settings** → **Deploy** 中，确认 Start Command 为：
```
node src/index.js
```

**c) 添加持久化存储卷**

在 **Volumes** 部分，添加一个挂载卷：
- **Mount Path**：`/app/data`
- **Volume Name**：`sqlite-data`

这样数据库文件不会因重启而丢失。

### 步骤 4：配置环境变量

在项目的 **Variables** 页面，添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|----|-----|
| `PORT` | `3001` | 服务端口 |
| `NODE_ENV` | `production` | **必须设为 production** |
| `JWT_SECRET` | `(生成随机密钥)` | JWT签名密钥，见下方生成方式 |
| `WX_APPID` | `wx开头的appid` | 微信小程序AppID |
| `WX_SECRET` | `你的AppSecret` | 微信小程序密钥 |
| `OPENROUTER_API_KEY` | `sk-or-开头` | OpenRouter API Key（可选） |
| `OPENROUTER_MODEL` | `deepseek/deepseek-chat-v3-0324` | AI模型（可选） |
| `AI_MAX_TOKENS` | `600` | AI输出长度 |
| `AI_TEMPERATURE` | `0.7` | AI创意程度 |
| `DB_PATH` | `/app/data/calendar.db` | 数据库路径（指向存储卷） |

> **生成安全的 JWT_SECRET**：
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```
> 将输出的 64 位十六进制字符串填入 `JWT_SECRET`。

### 步骤 5：生成域名并获取 HTTPS

Railway 会自动为你的服务生成一个 `xxx.up.railway.app` 域名，并自动配置 HTTPS 证书。

1. 在项目 **Settings** → **Networking** 中
2. 找到 **Public URL**（格式：`https://your-app.up.railway.app`）
3. 记录这个域名，后续需要配置到微信小程序后台

### 步骤 6：验证部署

在浏览器或命令行中访问健康检查端点：

```bash
curl https://your-app.up.railway.app/health
```

如果返回以下内容，说明部署成功：

```json
{"status":"ok","timestamp":"2026-06-03T10:00:00.000Z"}
```

---

## 环境变量配置清单

以下是所有环境变量的完整清单：

### 必填变量（生产环境）

| 变量名 | 示例值 | 说明 | 获取方式 |
|--------|--------|------|----------|
| `NODE_ENV` | `production` | 运行环境 | 手动设置 |
| `JWT_SECRET` | `a1b2c3...` | JWT签名密钥 | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `WX_APPID` | `wx1234567890abcdef` | 微信AppID | 微信公众平台 → 开发管理 → 开发设置 |
| `WX_SECRET` | `abc123...` | 微信AppSecret | 同上页面（重置后旧密钥作废） |

### 可选变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `3001` | 服务端口号 |
| `OPENROUTER_API_KEY` | — | AI API密钥，不填则使用离线模拟建议 |
| `OPENROUTER_MODEL` | `deepseek/deepseek-chat-v3-0324` | AI模型名称 |
| `AI_MAX_TOKENS` | `600` | AI最大输出长度 |
| `AI_TEMPERATURE` | `0.7` | AI输出温度（0-2） |
| `DB_PATH` | `./data/calendar.db` | 数据库文件路径 |

---

## 数据库说明

### 数据库类型

项目使用 **SQLite** 作为数据库，通过 `better-sqlite3` 驱动连接。

### 数据库文件

- 默认路径：`./data/calendar.db`
- Railway：`/app/data/calendar.db`（挂载存储卷后）

### 表结构

数据库在服务首次启动时自动创建，包含三张表：

- **users**：用户信息（id, openid, nickname, avatar_url）
- **schedules**：日程数据（id, title, content, category, schedule_date 等）
- **suggestions**：AI建议（id, schedule_id, content, category, tips, time_plan）

### 备份建议

**Railway 平台**：
- 存储卷数据已自动备份
- 可通过 Railway CLI 手动下载：`railway volume download`

**手动备份**（本地/服务器部署）：
```bash
# 停止服务后复制数据库文件
cp data/calendar.db data/calendar.db.backup.$(date +%Y%m%d)
```

### 数据迁移

如需迁移数据库，只需复制 `calendar.db` 文件到新环境的对应目录。

---

## 健康检查

健康检查端点不需要任何认证，可直接访问。

**端点**：`GET /health`

**返回示例**：
```json
{
  "status": "ok",
  "timestamp": "2026-06-03T10:00:00.000Z"
}
```

**使用场景**：
- Railway 会自动检查服务是否正常运行
- 可用作 Uptime Robot 等监控工具的检测地址
- 排查问题时快速确认服务是否在线

---

## HTTPS 配置

微信小程序强制要求所有请求域名必须为 **HTTPS**，因此后端必须配置 HTTPS。

### Railway 自动 HTTPS

Railway 自动为你的域名配置 Let's Encrypt SSL 证书，**无需任何额外配置**。

### 其他平台手动配置

如果使用自建服务器，推荐以下方案：

#### a) Nginx 反向代理（推荐）
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### b) 使用 Cloudflare
1. 将域名 DNS 托管到 Cloudflare
2. 开启 Cloudflare SSL（Flexible 模式即可）
3. 不需要在服务器上配置证书

#### c) 使用 Caddy（自动 HTTPS）
```
your-domain.com {
    reverse_proxy localhost:3001
}
```
Caddy 会自动申请和续签 Let's Encrypt 证书。

---

## 常见问题

### Q: SQLite 数据会丢失吗？

A: 在 Railway 上配置了存储卷（Volume）后不会丢失。如果部署在其他平台，请确保 `data/` 目录不会被容器重启清空。

### Q: 微信登录报错 401？

A: 确保 `WX_APPID` 和 `WX_SECRET` 已正确配置，且已在微信公众平台添加服务器域名到白名单。

### Q: AI 建议返回的是离线模板？

A: 检查 `OPENROUTER_API_KEY` 是否正确设置。没有 API Key 时系统会自动使用高质量的离线模拟建议。

### Q: 如何更新部署？

A: Railway 默认启用自动部署。只需将代码推送到 GitHub 主分支，Railway 会自动重新构建和部署。

### Q: 端口号需要改吗？

A: Railway 会通过 `PORT` 环境变量自动分配端口，不需要手动修改。自建服务器上可以保持 3001。

### Q: 如何查看服务日志？

A: 在 Railway 项目页面的 **Deployments** → 选择最新部署 → **Build Logs** / **Deploy Logs** 查看。

### Q: 服务启动失败怎么办？

A: 
1. 检查所有必填环境变量是否已配置
2. 查看 Railway 部署日志确认具体错误
3. 确认 `data/` 目录有写入权限
4. 确认所有依赖已安装（`npm install`）
