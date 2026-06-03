// utils/constants.js - 全局共享常量（分类映射、配色等）

const CATEGORY_MAP = {
  travel: { name: '出差旅行', icon: '✈️', color: '#0052D9' },
  fitness: { name: '健身运动', icon: '💪', color: '#E34D59' },
  meeting: { name: '会议工作', icon: '📋', color: '#2BA471' },
  study: { name: '学习充电', icon: '📚', color: '#7B45CF' },
  social: { name: '社交聚会', icon: '🎉', color: '#E37318' },
  life: { name: '生活日常', icon: '🏠', color: '#5E5E5E' },
  health: { name: '健康养生', icon: '🧘', color: '#0594FA' },
  general: { name: '其他', icon: '📌', color: '#8B8B8B' },
};

/**
 * 根据分类key获取分类信息
 */
function getCategoryInfo(category) {
  return CATEGORY_MAP[category] || CATEGORY_MAP.general;
}

/**
 * 为日程数据补充分类展示信息
 */
function enrichSchedule(schedule) {
  const cat = getCategoryInfo(schedule.category);
  return {
    ...schedule,
    categoryName: cat.name,
    categoryIcon: cat.icon,
    categoryColor: cat.color,
  };
}

/**
 * 截取内容预览（不超过指定字数和行数）
 */
function contentPreview(content, maxLen = 150) {
  if (!content) return '';
  return content.length > maxLen ? content.substring(0, maxLen) + '...' : content;
}

module.exports = {
  CATEGORY_MAP,
  getCategoryInfo,
  enrichSchedule,
  contentPreview,
};
