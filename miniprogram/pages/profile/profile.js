// pages/profile/profile.js
const app = getApp();

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    stats: {
      scheduleCount: 0,
      suggestionCount: 0,
      dayCount: 0,
    },
  },

  onShow() {
    this.checkLogin();
    if (app.globalData.token) {
      this.loadStats();
    }
  },

  checkLogin() {
    const userInfo = app.globalData.userInfo;
    this.setData({
      isLoggedIn: !!userInfo,
      userInfo: userInfo || null,
    });
  },

  // 微信登录
  async onLogin(e) {
    if (!e.detail.userInfo) {
      wx.showToast({ title: '需要授权才能使用', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '登录中...' });

    try {
      // 获取微信登录code
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject,
        });
      });

      // 调用后端登录接口
      const res = await app.request({
        url: '/auth/login',
        method: 'POST',
        data: { code: loginRes.code },
      });

      if (res.code === 0) {
        app.globalData.token = res.data.token;
        app.globalData.userInfo = res.data.user;
        wx.setStorageSync('token', res.data.token);

        // 更新用户昵称和头像
        const wxUserInfo = e.detail.userInfo;
        await app.request({
          url: '/user/profile',
          method: 'PUT',
          data: {
            nickname: wxUserInfo.nickName,
            avatarUrl: wxUserInfo.avatarUrl,
          },
        });

        this.setData({
          isLoggedIn: true,
          userInfo: {
            id: res.data.user.id,
            nickname: wxUserInfo.nickName,
            avatarUrl: wxUserInfo.avatarUrl,
          },
        });

        wx.hideLoading();
        wx.showToast({ title: '登录成功', icon: 'success' });
        this.loadStats();
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '登录失败', icon: 'none' });
    }
  },

  // 加载统计数据
  async loadStats() {
    try {
      // 获取日程总数
      const scheduleRes = await app.request({
        url: '/schedules',
      });
      const suggestionsRes = await app.request({
        url: '/ai/suggestions?pageSize=999',
      });

      const scheduleCount = (scheduleRes.data || []).length;
      const suggestionCount = suggestionsRes.data?.pagination?.total || 0;

      // 计算有日程的天数
      const dates = new Set((scheduleRes.data || []).map(s => s.schedule_date));

      this.setData({
        'stats.scheduleCount': scheduleCount,
        'stats.suggestionCount': suggestionCount,
        'stats.dayCount': dates.size,
      });
    } catch {
      // 忽略
    }
  },

  goToSuggestion() {
    wx.switchTab({ url: '/pages/suggestion/suggestion' });
  },

  exportData() {
    wx.showToast({ title: '功能开发中...', icon: 'none' });
  },

  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除本地缓存吗？不会影响你的日程数据。',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.showToast({ title: '缓存已清除', icon: 'success' });
        }
      },
    });
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.clearLogin();
          this.setData({
            isLoggedIn: false,
            userInfo: null,
          });
          wx.showToast({ title: '已退出', icon: 'success' });
        }
      },
    });
  },
});
