const express = require('express');
const cors = require('cors');
const config = require('./config');

// 初始化数据库
require('./db');

// 路由
const authRoutes = require('./routes/auth');
const scheduleRoutes = require('./routes/schedules');
const aiRoutes = require('./routes/ai');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 请求日志
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/ai', aiRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在', data: null });
});

// 全局错误处理
app.use((err, _req, res, _next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
});

// 启动
const server = app.listen(config.port, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   🗓️  AI Smart Calendar Server           ║
║   智能AI日历后端服务                       ║
║   端口: ${config.port}                          ║
║   环境: ${config.nodeEnv}                    ║
╚═══════════════════════════════════════════╝
  `);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到停止信号，正在关闭服务...');
  server.close(() => process.exit(0));
});

module.exports = app;
