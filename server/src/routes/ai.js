const express = require('express');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');
const db = require('../db');
const { classifySchedule, generateSuggestion, recordUserCategoryChoice, parseScheduleIntent, resolveRelativeDate } = require('../services/ai.service');
const { success, fail } = require('../utils/response');

const router = express.Router();

router.use(authMiddleware);

/**
 * 为指定日程生成AI建议
 * POST /api/ai/suggest/:scheduleId
 */
router.post('/suggest/:scheduleId', async (req, res) => {
  try {
    const schedule = db.prepare('SELECT * FROM schedules WHERE id = ? AND user_id = ?')
      .get(req.params.scheduleId, req.userId);

    if (!schedule) {
      return res.json(fail(404, '日程不存在'));
    }

    // 0. 语义解析：提取结构化信息
    const fullText = `${schedule.title} ${schedule.content || ''}`;
    const intent = parseScheduleIntent(fullText);
    const relativeDate = schedule.schedule_date ? resolveRelativeDate(schedule.schedule_date) : null;

    if (intent.activityType || intent.locations.length > 0 || intent.people.length > 0) {
      console.log(`[语义解析] 日程"${schedule.title}"`, JSON.stringify({
        activityType: intent.activityType,
        locations: intent.locations,
        people: intent.people,
        durationHint: intent.durationHint,
        isUrgent: intent.isUrgent,
        confidence: Math.round(intent.confidence * 100) + '%',
        relativeDate: relativeDate?.expression || null,
      }));
    }

    // 1. 自动分类（传入userId以利用用户偏好学习）
    const classification = classifySchedule(schedule.title, schedule.content, req.userId);

    // 更新日程分类
    db.prepare("UPDATE schedules SET category = ?, updated_at = datetime('now') WHERE id = ?")
      .run(classification.category, schedule.id);

    // 2. 调用AI生成建议
    const aiResult = await generateSuggestion({
      title: schedule.title,
      content: schedule.content,
      category: classification.category,
      scheduleDate: schedule.schedule_date,
    });

    // 3. 保存建议到数据库
    const suggestionId = uuidv4();

    // 先删除旧建议
    db.prepare('DELETE FROM suggestions WHERE schedule_id = ?').run(schedule.id);

    db.prepare(`
      INSERT INTO suggestions (id, schedule_id, user_id, content, category, tips, time_plan)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      suggestionId,
      schedule.id,
      req.userId,
      aiResult.content,
      classification.category,
      JSON.stringify(aiResult.tips || []),
      JSON.stringify(aiResult.timePlan || [])
    );

    res.json(success({
      suggestion: {
        id: suggestionId,
        content: aiResult.content,
        category: classification.category,
        categoryName: classification.categoryName,
        icon: classification.icon,
        color: classification.color,
        tips: aiResult.tips || [],
        timePlan: aiResult.timePlan || [],
      },
      schedule: {
        id: schedule.id,
        title: schedule.title,
        category: classification.category,
      },
    }, 'AI建议已生成'));
  } catch (err) {
    console.error('生成AI建议失败:', err);
    res.json(fail(500, 'AI建议生成失败，请稍后重试'));
  }
});

/**
 * 获取历史AI建议列表
 * GET /api/ai/suggestions?page=1&pageSize=10
 */
router.get('/suggestions', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const total = db.prepare('SELECT COUNT(*) as count FROM suggestions WHERE user_id = ?')
      .get(req.userId).count;

    const suggestions = db.prepare(`
      SELECT s.*, sc.title as schedule_title, sc.schedule_date
      FROM suggestions s
      LEFT JOIN schedules sc ON s.schedule_id = sc.id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.userId, pageSize, offset);

    res.json({
      code: 0,
      message: 'success',
      data: {
        list: suggestions.map(item => ({
          ...item,
          tips: JSON.parse(item.tips || '[]'),
          timePlan: JSON.parse(item.time_plan || '[]'),
        })),
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (err) {
    console.error('获取建议列表失败:', err);
    res.json(fail(500, '服务器内部错误'));
  }
});

/**
 * 获取单个建议详情
 * GET /api/ai/suggestions/:id
 */
router.get('/suggestions/:id', (req, res) => {
  try {
    const suggestion = db.prepare(`
      SELECT s.*, sc.title as schedule_title, sc.schedule_date
      FROM suggestions s
      LEFT JOIN schedules sc ON s.schedule_id = sc.id
      WHERE s.id = ? AND s.user_id = ?
    `).get(req.params.id, req.userId);

    if (!suggestion) {
      return res.json(fail(404, '建议不存在'));
    }

    res.json(success({
      ...suggestion,
      tips: JSON.parse(suggestion.tips || '[]'),
      timePlan: JSON.parse(suggestion.timePlan || '[]'),
    }));
  } catch (err) {
    console.error('获取建议详情失败:', err);
    res.json(fail(500, '服务器内部错误'));
  }
});

/**
 * 手动修正日程分类（用于偏好学习）
 * POST /api/ai/category/:scheduleId
 * Body: { category: string }
 */
router.post('/category/:scheduleId', (req, res) => {
  try {
    const { category } = req.body;
    if (!category || !['travel', 'fitness', 'meeting', 'study', 'social', 'life', 'health', 'general'].includes(category)) {
      return res.json(fail(400, '无效的分类'));
    }

    const schedule = db.prepare('SELECT * FROM schedules WHERE id = ? AND user_id = ?')
      .get(req.params.scheduleId, req.userId);
    if (!schedule) {
      return res.json(fail(404, '日程不存在'));
    }

    // 更新日程分类
    db.prepare("UPDATE schedules SET category = ?, updated_at = datetime('now') WHERE id = ?")
      .run(category, req.params.scheduleId);

    // 记录用户偏好
    recordUserCategoryChoice(req.userId, category);

    res.json(success({ category }, '分类已更新'));
  } catch (err) {
    console.error('更新分类失败:', err);
    res.json(fail(500, '服务器内部错误'));
  }
});

module.exports = router;
