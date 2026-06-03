// pages/index/index.js - 日历首页逻辑
const app = getApp();
const { enrichSchedule } = require('../../utils/constants');

Page({
  data: {
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    currentYear: 2026,
    currentMonth: 6,
    selectedDate: '',
    selectedDateText: '今天',
    calendarDays: [],
    schedules: [],
    loading: false,
    showDetail: false,
    detailSchedule: {},
  },

  onLoad() {
    const now = new Date();
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1,
    });
    this.selectDateStr(this.formatDate(now));
    this.loadMonthData();
  },

  onShow() {
    // 每次显示时刷新日程
    if (this.data.selectedDate) {
      this.loadSchedules(this.data.selectedDate);
    }
  },

  // 格式化日期 YYYY-MM-DD
  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  // 加载月视图数据
  loadMonthData() {
    const { currentYear, currentMonth } = this.data;
    const year = currentYear;
    const month = currentMonth;

    // 当月第一天
    const firstDay = new Date(year, month - 1, 1);
    // 当月最后一天
    const lastDay = new Date(year, month, 0);
    // 第一天是周几
    const startWeek = firstDay.getDay();

    const today = new Date();
    const todayStr = this.formatDate(today);

    const days = [];

    // 填充上月末尾
    for (let i = startWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, -i);
      days.push({
        day: d.getDate(),
        dateStr: this.formatDate(d),
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        hasSchedule: false,
      });
    }

    // 当月日期
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month - 1, i);
      const dateStr = this.formatDate(d);
      days.push({
        day: i,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === this.data.selectedDate,
        hasSchedule: false,
      });
    }

    // 填充下月开头 (补齐到42格)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month, i);
      days.push({
        day: d.getDate(),
        dateStr: this.formatDate(d),
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        hasSchedule: false,
      });
    }

    this.setData({ calendarDays: days });
    this.loadMonthSchedules(year, month);
  },

  // 加载整月日程标记
  async loadMonthSchedules(year, month) {
    try {
      const res = await app.request({
        url: `/schedules?year=${year}&month=${month}`,
      });
      if (res.code === 0 && res.data) {
        const scheduleDates = new Set(res.data.map(s => s.schedule_date));
        const days = this.data.calendarDays.map(day => ({
          ...day,
          hasSchedule: scheduleDates.has(day.dateStr),
        }));
        this.setData({ calendarDays: days });
      }
    } catch {
      // 忽略错误
    }
  },

  // 选择日期
  selectDate(e) {
    const dateStr = e.currentTarget.dataset.date;
    this.selectDateStr(dateStr);
  },

  selectDateStr(dateStr) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDay = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];

    // 如果选择的日期在不同月份，切换月份
    if (date.getFullYear() !== this.data.currentYear || month !== this.data.currentMonth) {
      this.setData({
        currentYear: date.getFullYear(),
        currentMonth: month,
        selectedDate: dateStr,
        selectedDateText: `${month}月${day}日 周${weekDay}`,
      });
      this.loadMonthData();
    } else {
      this.setData({
        selectedDate: dateStr,
        selectedDateText: `${month}月${day}日 周${weekDay}`,
      });
      // 更新选中状态
      const days = this.data.calendarDays.map(d => ({
        ...d,
        isSelected: d.dateStr === dateStr,
      }));
      this.setData({ calendarDays: days });
    }

    this.loadSchedules(dateStr);
  },

  // 加载日程
  async loadSchedules(date) {
    this.setData({ loading: true });
    try {
      const res = await app.request({
        url: `/schedules?date=${date}`,
      });
      if (res.code === 0) {
        const schedules = (res.data || []).map(enrichSchedule);
        this.setData({ schedules, loading: false });
      }
    } catch {
      this.setData({ loading: false });
    }
  },

  // 上月
  prevMonth() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 1) {
      currentYear -= 1;
      currentMonth = 12;
    } else {
      currentMonth -= 1;
    }
    this.setData({ currentYear, currentMonth });
    this.loadMonthData();
  },

  // 下月
  nextMonth() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 12) {
      currentYear += 1;
      currentMonth = 1;
    } else {
      currentMonth += 1;
    }
    this.setData({ currentYear, currentMonth });
    this.loadMonthData();
  },

  // 回到今天
  goToday() {
    const today = new Date();
    this.setData({
      currentYear: today.getFullYear(),
      currentMonth: today.getMonth() + 1,
    });
    this.selectDateStr(this.formatDate(today));
    this.loadMonthData();
  },

  // 查看日程详情（适配组件事件）
  viewSchedule(e) {
    const id = e.detail ? e.detail.id : e.currentTarget.dataset.id;
    const schedule = this.data.schedules.find(s => s.id === id);
    if (schedule) {
      this.setData({
        showDetail: true,
        detailSchedule: schedule,
      });
    }
  },

  // 关闭详情
  closeDetail() {
    this.setData({ showDetail: false });
  },

  // 生成AI建议
  async generateAI() {
    const schedule = this.data.detailSchedule;
    if (!schedule || !schedule.id) return;

    wx.showLoading({ title: 'AI正在分析...' });

    try {
      const res = await app.request({
        url: `/ai/suggest/${schedule.id}`,
        method: 'POST',
      });

      wx.hideLoading();

      if (res.code === 0) {
        const suggestion = res.data.suggestion;
        const updatedSchedule = {
          ...this.data.detailSchedule,
          suggestion: {
            content: suggestion.content,
            tips: suggestion.tips,
            timePlan: suggestion.timePlan,
          },
          category: suggestion.category,
          categoryName: suggestion.categoryName,
          categoryIcon: suggestion.icon,
          categoryColor: suggestion.color,
        };

        // 合并为一次 setData 以减少跨线程通信
        this.setData({
          detailSchedule: updatedSchedule,
          schedules: this.data.schedules.map(s =>
            s.id === schedule.id ? updatedSchedule : s
          ),
        });

        wx.showToast({ title: 'AI建议已生成', icon: 'success' });
      } else {
        wx.showToast({ title: res.message || '生成失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  },

  // 删除日程
  async deleteSchedule() {
    const schedule = this.data.detailSchedule;
    if (!schedule) return;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${schedule.title}」吗？`,
      success: async (modalRes) => {
        if (modalRes.confirm) {
          try {
            await app.request({
              url: `/schedules/${schedule.id}`,
              method: 'DELETE',
            });
            this.setData({ showDetail: false });
            this.loadSchedules(this.data.selectedDate);
            this.loadMonthData();
            wx.showToast({ title: '已删除', icon: 'success' });
          } catch {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      },
    });
  },

  // 编辑日程
  editSchedule() {
    const schedule = this.data.detailSchedule;
    if (!schedule) return;
    wx.navigateTo({
      url: `/pages/add-schedule/add-schedule?id=${schedule.id}&title=${encodeURIComponent(schedule.title)}&date=${schedule.schedule_date}&time=${schedule.schedule_time || ''}&content=${encodeURIComponent(schedule.content || '')}&category=${schedule.category || 'general'}`,
    });
  },

  // 添加日程
  addSchedule() {
    wx.navigateTo({
      url: `/pages/add-schedule/add-schedule?date=${this.data.selectedDate}`,
    });
  },
});
