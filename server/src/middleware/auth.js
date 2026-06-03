const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

/**
 * JWT认证中间件
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 401,
      message: '未登录，请先授权登录',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.userId = decoded.userId;

    // 验证用户是否存在
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.userId);
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '用户不存在',
      });
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 401,
        message: '登录已过期，请重新登录',
      });
    }
    return res.status(401).json({
      code: 401,
      message: '无效的登录凭证',
    });
  }
}

module.exports = authMiddleware;
