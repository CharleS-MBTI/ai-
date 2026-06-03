const express = require('express');
const authMiddleware = require('../middleware/auth');
const scheduleService = require('../services/schedule.service');
const { success, fail } = require('../utils/response');

const router = express.Router();

// 所有日程接口都需要认证
router.use(authMiddleware);

/**
 * 获取日程列表
 * GET /api/schedules?date=2026-06-03 或 ?year=2026&month=6
 */
router.get('/', (req, res) => {
  try {
    const { date, year, month } = req.query;
    const schedules = scheduleService.list(req.userId, {
      date: date || undefined,
      year: year ? parseInt(year) : undefined,
      month: month ? parseInt(month) : undefined,
    });
    res.json(success(schedules));
  } catch (err) {
    console.error('获取日程列表失败:', err);
    res.json(fail(500, '服务器内部错误'));
  }
});

/**
 * 获取日程详情
 * GET /api/schedules/:id
 */
router.get('/:id', (req, res) => {
  try {
    const schedule = scheduleService.getById(req.params.id, req.userId);
    if (!schedule) {
      return res.json(fail(404, '日程不存在'));
    }
    res.json(success(schedule));
  } catch (err) {
    console.error('获取日程详情失败:', err);
    res.json(fail(500, '服务器内部错误'));
  }
});

/**
 * 创建日程
 * POST /api/schedules
 * Body: { title, content, scheduleDate, scheduleTime, category }
 */
router.post('/', (req, res) => {
  try {
    const { title, content, scheduleDate, scheduleTime, category } = req.body;

    if (!title || !scheduleDate) {
      return res.json(fail(400, '标题和日期不能为空'));
    }

    const schedule = scheduleService.create(req.userId, {
      title,
      content,
      scheduleDate,
      scheduleTime,
      category,
    });

    res.json(success(schedule, '日程创建成功'));
  } catch (err) {
    console.error('创建日程失败:', err);
    res.json(fail(500, '服务器内部错误'));
  }
});

/**
 * 更新日程
 * PUT /api/schedules/:id
 */
router.put('/:id', (req, res) => {
  try {
    const schedule = scheduleService.update(req.params.id, req.userId, req.body);
    if (!schedule) {
      return res.json(fail(404, '日程不存在'));
    }
    res.json(success(schedule, '日程更新成功'));
  } catch (err) {
    console.error('更新日程失败:', err);
    res.json(fail(500, '服务器内部错误'));
  }
});

/**
 * 删除日程
 * DELETE /api/schedules/:id
 */
router.delete('/:id', (req, res) => {
  try {
    const deleted = scheduleService.delete(req.params.id, req.userId);
    if (!deleted) {
      return res.json(fail(404, '日程不存在'));
    }
    res.json(success(null, '日程已删除'));
  } catch (err) {
    console.error('删除日程失败:', err);
    res.json(fail(500, '服务器内部错误'));
  }
});

module.exports = router;
