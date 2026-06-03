// app.js
App({
  globalData: {
    userInfo: null,
    token: null,
    // ==========================================
    // ⚠️ 发布前必改：将 baseUrl 替换为你的生产环境 HTTPS 域名
    // 示例：baseUrl: 'https://your-domain.com/api',
    // ==========================================
    baseUrl: 'http://localhost:3001/api',
  },

  onLaunch() {
    // 检查登录状态
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      this.checkLogin();
    }
  },

  // 检查登录是否有效
  async checkLogin() {
    try {
      const res = await this.request({
        url: '/user/profile',
        method: 'GET',
      });
      if (res.code === 0) {
        this.globalData.userInfo = res.data;
      } else {
        this.clearLogin();
      }
    } catch {
      // 静默失败，等用户操作时再提示
    }
  },

  // 清除登录状态
  clearLogin() {
    this.globalData.token = null;
    this.globalData.userInfo = null;
    wx.removeStorageSync('token');
  },

  // 统一请求方法
  request(options) {
    return new Promise((resolve, reject) => {
      const token = this.globalData.token || wx.getStorageSync('token');

      wx.request({
        url: `${this.globalData.baseUrl}${options.url}`,
        method: options.method || 'GET',
        data: options.data || {},
        header: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
          ...options.header,
        },
        success: (res) => {
          if (res.statusCode === 401) {
            this.clearLogin();
            wx.showToast({ title: '请重新登录', icon: 'none' });
            reject(new Error('未登录'));
            return;
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            reject(new Error(`请求失败: ${res.statusCode}`));
          }
        },
        fail: (err) => {
          wx.showToast({ title: '网络请求失败', icon: 'none' });
          reject(err);
        },
      });
    });
  },
});
