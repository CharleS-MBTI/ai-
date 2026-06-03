# AI智能日历 — 5分钟部署指南

> 本指南带你从零到上线，分两个部分：后端部署（Railway）和前端发布（微信小程序）。

---

## Part 1: 后端部署到 Railway（约3分钟）

### 前置条件
- GitHub 账号
- Railway 账号（https://railway.app → Sign in with GitHub）

### 第1步：创建 GitHub 仓库

1. 打开 https://github.com/new
2. Repository name: `ai-smart-calendar`
3. 选择 **Private**（包含后端代码，建议私有）
4. 不要勾选 "Add a README file"、"Add .gitignore"、"Choose a license"
5. 点击 **Create repository**

### 第2步：推送代码

GitHub 创建仓库后会显示推送命令，复制并执行以下命令（在本项目根目录）：

```bash
cd ai-smart-calendar
git remote add origin https://github.com/你的用户名/ai-smart-calendar.git
git branch -M main
git push -u origin main
```

### 第3步：连接 Railway

1. 打开 https://railway.app/dashboard
2. 点击 **New Project** → **Deploy from GitHub repo**
3. 授权 Railway 访问你的 GitHub
4. 选择 `ai-smart-calendar` 仓库
5. Railway 会自动检测到 `server/` 目录的 Node.js 项目

### 第4步：配置根目录

Railway 需要知道服务在 `server/` 子目录：

1. 在项目 Dashboard → **Settings**
2. **Root Directory** 设为: `server`
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`

### 第5步：设置环境变量

在 Railway → 你的项目 → **Variables** 中添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `JWT_SECRET` | 生成一个随机字符串 | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NODE_ENV` | `production` | 生产环境 |
| `PORT` | `3001` | 服务端口 |
| `WX_APPID` | 你的小程序AppID | 微信小程序后台获取 |
| `WX_SECRET` | 你的小程序Secret | 微信小程序后台获取 |
| `OPENROUTER_API_KEY` | （可选） | https://openrouter.ai/keys |
| `OPENROUTER_MODEL` | `deepseek/deepseek-chat-v3-0324` | 默认即可 |
| `DB_PATH` | `/data/calendar.db` | Railway 持久化路径 |

> **重要**: `DB_PATH` 必须设为 `/data/calendar.db`（Railway 的持久化卷路径），否则数据库在重启后会丢失！

### 第6步：部署

Railway 自动部署。等待构建完成（约1-2分钟）。

部署成功后你会得到一个域名，类似：`ai-smart-calendar.up.railway.app`

### 第7步：验证

```bash
# 健康检查
curl https://你的域名.up.railway.app/health

# 预期返回: {"status":"ok","timestamp":"..."}
```

---

## Part 2: 微信小程序发布

### 前置准备

#### 1. 注册小程序
- 访问 https://mp.weixin.qq.com
- 选择「小程序」→ 填写信息 → 提交审核
- 主体类型：**企业**（个人主体无法使用微信支付等高级能力）
- 审核通过后获取 **AppID**

#### 2. 配置服务器域名

在微信小程序后台 → **开发** → **开发管理** → **服务器域名**：

| 类型 | 域名 |
|------|------|
| request 合法域名 | `https://你的域名.up.railway.app` |
| uploadFile 合法域名 | `https://你的域名.up.railway.app` |
| downloadFile 合法域名 | `https://你的域名.up.railway.app` |

> 注意：必须是 HTTPS，Railway 自动提供 HTTPS。

#### 3. 准备 TabBar 图标

`miniprogram/images/` 目录需要6张图标（各需普通态 + 选中态）：

| 文件名 | 用途 | 尺寸 |
|--------|------|------|
| `calendar.png` / `calendar-active.png` | 日历 Tab | 81x81 |
| `plus.png` / `plus-active.png` | 添加 Tab | 81x81 |
| `profile.png` / `profile-active.png` | 我的 Tab | 81x81 |

> 可使用 iconfont 或设计师提供的图标。图标已为你预留在 `images/` 目录。

### 小程序代码配置

#### 修改 app.js（第4行）
```javascript
globalData: {
  baseUrl: 'https://你的域名.up.railway.app', // ← 改为 Railway 生产域名
}
```

#### 修改 project.config.json（第2行）
```json
"appid": "你的AppID"  // ← 改为微信分配的 AppID
```

### 上传发布

1. 打开 **微信开发者工具**
2. 导入项目 → 选择 `miniprogram/` 目录
3. 填写 AppID
4. 点击工具栏 **上传** 按钮
5. 填写版本号（如 `1.0.0`）和更新说明
6. 登录微信小程序后台 → **版本管理**
7. 选择刚上传的版本 → **提交审核**
8. 等待审核通过（通常1-3个工作日）

### 审核注意事项

- 确保「用户隐私保护指引」已配置
- 首次登录需要授权弹窗
- 禁止测试数据残留
- 内容合规（不涉政、不涉黄赌毒）
- 功能完整可用

---

## 快速诊断

| 问题 | 检查项 |
|------|--------|
| Railway 部署失败 | 查看 Railway Logs → Deployments |
| 小程序请求失败 | 域名是否已配置到白名单？是 HTTPS 吗？ |
| AI 建议返回空 | OPENROUTER_API_KEY 是否设置？ |
| 数据库丢失 | DB_PATH 是否为 `/data/calendar.db`？ |

---

## 成本估算

| 项目 | 费用 |
|------|------|
| Railway 免费额度 | $0/月（512MB RAM, 1GB 磁盘, $5 免费额度足够用） |
| 微信小程序认证 | ¥300/年（企业认证费） |
| OpenRouter API | 按量付费，DeepSeek V3 约 ¥0.5/1000次调用 |
| **月均总计** | **< ¥30** |
