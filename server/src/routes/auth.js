const express = require('express');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const authMiddleware = require('../middleware/auth');
const { success, fail } = require('../utils/response');

const router = express.Router();

/**
 * 微信登录
 * POST /api/auth/login
 * Body: { code: string } - wx.login()返回的code
 */
router.post('/login', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.json(fail(400, '缺少登录凭证code'));
    }

    // 开发环境使用模拟登录
    let openid, sessionKey;

    if (config.nodeEnv === 'development' || !config.wx.appId) {
      // 模拟微信登录
      openid = `mock_openid_${code.substring(0, 8)}`;
      sessionKey = 'mock_session_key';
    } else {
      // 真实微信登录
      const wxResponse = await fetch(
        `https://api.weixin.qq.com/sns/jscode2session?appid=${config.wx.appId}&secret=${config.wx.secret}&js_code=${code}&grant_type=authorization_code`
      );
      const wxData = await wxResponse.json();

      if (wxData.errcode) {
        return res.json(fail(500, `微信登录失败: ${wxData.errmsg}`));
      }

      openid = wxData.openid;
      sessionKey = wxData.session_key;
    }

    // 查找或创建用户
    let user = db.prepare('SELECT * FROM users WHERE openid = ?').get(openid);

    if (!user) {
      const userId = uuidv4();
      db.prepare('INSERT INTO users (id, openid) VALUES (?, ?)').run(userId, openid);
      user = { id: userId, openid, nickname: '', avatar_url: '' };
    }

    // 生成JWT
    const token = jwt.sign(
      { userId: user.id },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json(success({
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatar_url,
      },
    }, '登录成功'));
  } catch (err) {
    console.error('登录失败:', err);
    res.json(fail(500, '服务器内部错误'));
  }
});

/**
 * 获取用户信息
 * GET /api/user/profile
 */
router.get('/user/profile', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, openid, nickname, avatar_url, created_at FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.json(fail(404, '用户不存在'));

  res.json(success({
    id: user.id,
    nickname: user.nickname,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
  }));
});

/**
 * 更新用户信息
 * PUT /api/user/profile
 */
router.put('/user/profile', authMiddleware, (req, res) => {
  const { nickname, avatarUrl } = req.body;

  db.prepare("UPDATE users SET nickname = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?")
    .run(nickname || '', avatarUrl || '', req.userId);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  res.json(success({
    id: user.id,
    nickname: user.nickname,
    avatarUrl: user.avatar_url,
  }, '更新成功'));
});

module.exports = router;
