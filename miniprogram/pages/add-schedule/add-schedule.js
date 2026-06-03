// pages/add-schedule/add-schedule.js
const app = getApp();

Page({
  data: {
    id: '',            // 编辑模式下的日程ID
    title: '',
    scheduleDate: '',
    scheduleTime: '',
    content: '',
    canSubmit: false,
    isEdit: false,     // 是否为编辑模式
    examples: [
      '明天出差去杭州，跟合作方洽谈项目，住西湖区',
      '下午3点去健身房，练胸和三头',
      '后天上午10点开产品评审会，需要演示新版原型',
      '周末去参加朋友婚礼，在市中心酒店',
      '下周一开始准备PMP考试，每天学习2小时',
    ],
  },

  onLoad(options) {
    if (options.id) {
      // 编辑模式：预填数据
      this.setData({
        id: options.id,
        isEdit: true,
        title: decodeURIComponent(options.title || ''),
        scheduleDate: options.date || '',
        scheduleTime: options.time || '',
        content: decodeURIComponent(options.content || ''),
      });
    } else if (options.date) {
      this.setData({ scheduleDate: options.date });
    } else {
      const now = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      this.setData({ scheduleDate: date });
    }
    this.checkCanSubmit();
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
    this.checkCanSubmit();
  },

  onDateChange(e) {
    this.setData({ scheduleDate: e.detail.value });
    this.checkCanSubmit();
  },

  onTimeChange(e) {
    this.setData({ scheduleTime: e.detail.value });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  useExample(e) {
    const text = e.currentTarget.dataset.text;
    this.setData({ title: text });
    this.checkCanSubmit();
  },

  checkCanSubmit() {
    this.setData({
      canSubmit: !!this.data.title && !!this.data.scheduleDate,
    });
  },

  // 创建/更新并生成AI建议
  async submitSchedule() {
    if (!this.data.canSubmit) return;

    wx.showLoading({ title: '正在保存...' });

    try {
      const payload = {
        title: this.data.title,
        content: this.data.content,
        scheduleDate: this.data.scheduleDate,
        scheduleTime: this.data.scheduleTime,
      };

      let schedule;
      if (this.data.isEdit) {
        // 编辑模式：PUT 更新
        const updateRes = await app.request({
          url: `/schedules/${this.data.id}`,
          method: 'PUT',
          data: payload,
        });
        if (updateRes.code !== 0) throw new Error(updateRes.message);
        schedule = updateRes.data;
      } else {
        // 新建模式：POST 创建
        const createRes = await app.request({
          url: '/schedules',
          method: 'POST',
          data: payload,
        });
        if (createRes.code !== 0) throw new Error(createRes.message);
        schedule = createRes.data;
      }

      wx.showLoading({ title: 'AI正在分析...' });

      const aiRes = await app.request({
        url: `/ai/suggest/${schedule.id}`,
        method: 'POST',
      });

      wx.hideLoading();

      if (aiRes.code === 0) {
        wx.showToast({ title: 'AI建议已生成', icon: 'success' });
      } else {
        wx.showToast({ title: this.data.isEdit ? '已更新' : '已保存', icon: 'success' });
      }

      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 1500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
    }
  },

  // 仅保存（不生成AI建议）
  async saveOnly() {
    if (!this.data.canSubmit) return;

    wx.showLoading({ title: '正在保存...' });

    try {
      const payload = {
        title: this.data.title,
        content: this.data.content,
        scheduleDate: this.data.scheduleDate,
        scheduleTime: this.data.scheduleTime,
      };

      let res;
      if (this.data.isEdit) {
        res = await app.request({
          url: `/schedules/${this.data.id}`,
          method: 'PUT',
          data: payload,
        });
      } else {
        res = await app.request({
          url: '/schedules',
          method: 'POST',
          data: payload,
        });
      }

      wx.hideLoading();

      if (res.code === 0) {
        wx.showToast({ title: this.data.isEdit ? '已更新' : '已保存', icon: 'success' });
        setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 1500);
      }
    } catch {
      wx.hideLoading();
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
    }
  },
});
