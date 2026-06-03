const db = require('../db');
const { v4: uuidv4 } = require('uuid');

const scheduleService = {
  /**
   * 获取用户某一天/月的日程列表
   */
  list(userId, { date, month, year }) {
    let query = 'SELECT * FROM schedules WHERE user_id = ?';
    const params = [userId];

    if (date) {
      query += ' AND schedule_date = ?';
      params.push(date);
    } else if (year && month) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      query += ' AND schedule_date >= ? AND schedule_date <= ?';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY schedule_date DESC, schedule_time ASC';
    return db.prepare(query).all(...params);
  },

  /**
   * 获取日程详情
   */
  getById(id, userId) {
    const schedule = db.prepare('SELECT * FROM schedules WHERE id = ? AND user_id = ?').get(id, userId);
    if (schedule) {
      const suggestion = db.prepare('SELECT * FROM suggestions WHERE schedule_id = ?').get(id);
      schedule.suggestion = suggestion || null;
    }
    return schedule;
  },

  /**
   * 创建日程
   */
  create(userId, { title, content, scheduleDate, scheduleTime, category }) {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO schedules (id, user_id, title, content, category, schedule_date, schedule_time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId, title, content || '', category || 'general', scheduleDate, scheduleTime || '');
    return this.getById(id, userId);
  },

  /**
   * 更新日程
   */
  update(id, userId, data) {
    const fields = [];
    const params = [];

    if (data.title !== undefined) { fields.push('title = ?'); params.push(data.title); }
    if (data.content !== undefined) { fields.push('content = ?'); params.push(data.content); }
    if (data.category !== undefined) { fields.push('category = ?'); params.push(data.category); }
    if (data.scheduleDate !== undefined) { fields.push('schedule_date = ?'); params.push(data.scheduleDate); }
    if (data.scheduleTime !== undefined) { fields.push('schedule_time = ?'); params.push(data.scheduleTime); }
    if (data.status !== undefined) { fields.push('status = ?'); params.push(data.status); }

    if (fields.length === 0) return this.getById(id, userId);

    fields.push("updated_at = datetime('now')");
    params.push(id, userId);

    db.prepare(`UPDATE schedules SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
    return this.getById(id, userId);
  },

  /**
   * 删除日程
   */
  delete(id, userId) {
    const result = db.prepare('DELETE FROM schedules WHERE id = ? AND user_id = ?').run(id, userId);
    return result.changes > 0;
  },
};

module.exports = scheduleService;
