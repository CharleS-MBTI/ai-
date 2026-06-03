# 🗓️ AI智能日历 - 微信小程序

## 项目概述

一款基于AI的智能日历微信小程序。用户可以输入日程内容，AI自动分析并生成100-200字的专业建议和规划，覆盖出差旅行、健身运动、会议工作、学习充电、社交聚会、生活日常、健康养生等7大场景。

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────┐
│                  微信小程序 (WXML/WXSS/JS)             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────┐ │
│  │ 日历首页  │  │ 添加日程  │  │ AI建议页  │  │ 我的 │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──┬───┘ │
│       └──────────────┴────────────┴────────────┘     │
│                        │ HTTPS                       │
├────────────────────────┼────────────────────────────┤
│                   Express API 后端                    │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐            │
│  │ 认证服务 │  │ 日程服务 │  │ AI服务    │            │
│  │ (JWT)   │  │ (CRUD)  │  │ (OpenRouter)│          │
│  └────┬────┘  └────┬────┘  └────┬─────┘            │
│       └────────────┴────────────┘                   │
│                    │ SQLite                          │
│                    ▼                                 │
│              ┌──────────┐                            │
│              │  SQLite   │                            │
│              └──────────┘                            │
└─────────────────────────────────────────────────────┘
```

## 📁 项目结构

```
ai-smart-calendar/
├── server/                        # Express后端
│   ├── src/
│   │   ├── index.js              # 入口文件
│   │   ├── config.js             # 配置中心
│   │   ├── db/
│   │   │   └── index.js          # SQLite数据库初始化
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT认证中间件
│   │   ├── routes/
│   │   │   ├── auth.js           # 登录认证路由
│   │   │   ├── schedules.js      # 日程CRUD路由
│   │   │   └── ai.js             # AI建议路由
│   │   ├── services/
│   │   │   ├── ai.service.js     # AI建议生成服务（核心）
│   │   │   └── schedule.service.js
│   │   └── utils/
│   │       └── response.js       # 统一响应格式
│   ├── .env.example
│   ├── .env
│   └── package.json
├── miniprogram/                   # 微信小程序前端
│   ├── app.js                    # 全局App + 请求封装
│   ├── app.json                  # 页面路由 + tabBar
│   ├── app.wxss                  # 全局样式变量
│   ├── pages/
│   │   ├── index/                # 日历首页（月视图+日程列表）
│   │   ├── add-schedule/         # 添加日程页
│   │   ├── suggestion/           # AI建议列表页
│   │   └── profile/              # 个人中心
│   ├── project.config.json
│   └── sitemap.json
└── README.md
```

## 🚀 快速启动

### 1. 后端启动

```bash
cd server
cp .env.example .env
# 编辑 .env 填入你的 OPENROUTER_API_KEY 等配置
npm install
npm start
```

服务运行在 `http://localhost:3001`

### 2. 小程序启动

1. 下载[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入 `miniprogram/` 目录
3. 修改 `app.js` 中的 `baseUrl` 为你的后端地址（生产环境需HTTPS域名）
4. 在微信公众平台注册小程序并替换 `project.config.json` 中的 `appid`

## 🔌 API接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 微信登录 |
| GET | /api/user/profile | 获取用户信息 |
| PUT | /api/user/profile | 更新用户信息 |
| GET | /api/schedules | 获取日程列表 |
| POST | /api/schedules | 创建日程 |
| GET | /api/schedules/:id | 获取日程详情 |
| PUT | /api/schedules/:id | 更新日程 |
| DELETE | /api/schedules/:id | 删除日程 |
| POST | /api/ai/suggest/:scheduleId | 生成AI建议 |
| GET | /api/ai/suggestions | 获取AI建议列表 |

## 🤖 AI分类体系

| 分类 | 图标 | 触发关键词示例 |
|------|------|---------------|
| 出差旅行 | ✈️ | 出差、旅行、飞、酒店、火车 |
| 健身运动 | 💪 | 健身、跑步、游泳、瑜伽 |
| 会议工作 | 📋 | 会议、评审、汇报、面试 |
| 学习充电 | 📚 | 学习、考试、课程、读书 |
| 社交聚会 | 🎉 | 聚会、约会、婚礼、聚餐 |
| 生活日常 | 🏠 | 购物、做饭、搬家、看病 |
| 健康养生 | 🧘 | 体检、中医、养生、按摩 |

## 🎯 AI建议示例

输入：**"明天出差去杭州"**

输出：
```
【时间规划】
建议提前2小时出发...

【实用攻略】
杭州必游西湖、灵隐寺，推荐品尝龙井虾仁、
东坡肉等杭帮菜。地铁出行最便捷...

【必备清单】
- 身份证
- 充电宝
- 常用药品
- 防晒用品

【注意事项】
注意天气变化，备好雨具...
```

## 🔑 核心特性

- ✅ 微信一键登录
- ✅ 月视图日历 + 日程管理
- ✅ AI自动分类（7大场景）
- ✅ 智能建议生成（100-200字）
- ✅ 时间规划 + 实用攻略
- ✅ 离线降级方案（无API Key也能用）
- ✅ 统一API响应格式
- ✅ JWT认证 + SQLite持久化

## 📝 配置说明

| 环境变量 | 必填 | 说明 |
|----------|------|------|
| PORT | 否 | 服务端口，默认3001 |
| JWT_SECRET | 是 | JWT签名密钥 |
| OPENROUTER_API_KEY | 否 | AI API密钥（不填则用离线建议） |
| DB_PATH | 否 | SQLite数据库路径 |
| WX_APPID | 否 | 微信小程序AppID |
| WX_SECRET | 否 | 微信小程序Secret |
