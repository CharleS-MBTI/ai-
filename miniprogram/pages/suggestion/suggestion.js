// pages/suggestion/suggestion.js
const app = getApp();
const { getCategoryInfo, contentPreview } = require('../../utils/constants');

Page({
  data: {
    suggestions: [],
    loading: true,
    page: 1,
    pageSize: 10,
    hasMore: false,
  },

  onShow() {
    this.setData({ suggestions: [], page: 1 });
    this.loadSuggestions();
  },

  async loadSuggestions() {
    this.setData({ loading: true });

    try {
      const res = await app.request({
        url: `/ai/suggestions?page=${this.data.page}&pageSize=${this.data.pageSize}`,
      });

      if (res.code === 0 && res.data) {
        const list = (res.data.list || []).map(item => {
          const cat = getCategoryInfo(item.category);
          return {
            ...item,
            icon: cat.icon,
            categoryName: cat.name,
            color: cat.color,
            contentPreview: contentPreview(item.content, 150),
            timePlan: item.timePlan || [],
            tips: item.tips || [],
          };
        });

        const suggestions = this.data.page === 1
          ? list
          : [...this.data.suggestions, ...list];

        const pagination = res.data.pagination;
        this.setData({
          suggestions,
          loading: false,
          hasMore: pagination.page < pagination.totalPages,
        });
      } else {
        this.setData({ loading: false });
      }
    } catch {
      this.setData({ loading: false });
    }
  },

  loadMore() {
    if (!this.data.hasMore) return;
    this.setData({ page: this.data.page + 1 });
    this.loadSuggestions();
  },

  viewDetail(e) {
    const id = e.currentTarget.dataset.id;
    const suggestion = this.data.suggestions.find(s => s.id === id);
    if (suggestion) {
      wx.navigateTo({
        url: `/pages/suggestion/suggestion?id=${id}`,
      });
    }
  },

  goCalendar() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
