const config = require('../config');

/**
 * 日程分类体系 - 基于关键词权重规则快速分类
 * 权重说明：high=100(强特征词), medium=60(中等特征), low=30(弱特征词)
 */
const CATEGORIES = {
  travel: {
    name: '出差旅行',
    icon: '✈️',
    color: '#0052D9',
    keywords: {
      high: ['出差', '旅行', '旅游', '航班', '签证', '登机', '行程单', '出入境'],
      medium: ['高铁', '飞机', '机场', '酒店', '火车站', '攻略', '景点', '游玩', '观光'],
      low: ['去', '飞', '行李', '车站', '出发', '到达', '返程', '订票'],
    },
  },
  fitness: {
    name: '健身运动',
    icon: '💪',
    color: '#E34D59',
    keywords: {
      high: ['健身', '跑步', '游泳', '瑜伽', '马拉松', '举铁', '私教课'],
      medium: ['运动', '锻炼', '骑行', '打球', '篮球', '足球', '有氧', '训练'],
      low: ['羽毛球', '乒乓球', '健身房', '拉伸', '热身', '运动鞋'],
    },
  },
  meeting: {
    name: '会议工作',
    icon: '📋',
    color: '#2BA471',
    keywords: {
      high: ['会议', '开会', '评审', '汇报', '演示', '提案', '上线', '发布'],
      medium: ['面试', '项目', '复盘', '周报', '日报', '讨论', '需求', '排期'],
      low: ['沟通', '协作', '对齐', '同步', '确认', '总结'],
    },
  },
  study: {
    name: '学习充电',
    icon: '📚',
    color: '#7B45CF',
    keywords: {
      high: ['学习', '考试', '备考', '培训', '上课', '论文', '考证', '编程'],
      medium: ['课程', '读书', '看书', '复习', '网课', '笔记', '练习', '刷题'],
      low: ['书', '知识', '教程', '视频课', '阅读'],
    },
  },
  social: {
    name: '社交聚会',
    icon: '🎉',
    color: '#E37318',
    keywords: {
      high: ['聚会', '婚礼', '生日', '派对', '团建', '请客', '相亲'],
      medium: ['约会', '聚餐', '饭局', '喝酒', '唱K', '庆祝', '朋友家'],
      low: ['见朋友', '约', '一起', '吃饭', '逛街', '看电影', '下午茶'],
    },
  },
  life: {
    name: '生活日常',
    icon: '🏠',
    color: '#5E5E5E',
    keywords: {
      high: ['搬家', '看病', '签证', '缴费', '买房', '租房'],
      medium: ['购物', '做饭', '打扫', '理发', '取快递', '银行', '体检'],
      low: ['超市', '买菜', '整理', '收拾', '修理', '去趟'],
    },
  },
  health: {
    name: '健康养生',
    icon: '🧘',
    color: '#0594FA',
    keywords: {
      high: ['体检', '中医', '养生', '针灸', '心理', '咨询', '理疗'],
      medium: ['看病', '按摩', '冥想', '中药', '复查', '挂号', '医生'],
      low: ['身体', '健康', '休息', '放松', '睡眠'],
    },
  },
  general: {
    name: '其他',
    icon: '📌',
    color: '#8B8B8B',
    keywords: { high: [], medium: [], low: [] },
  },
};

// ============================================================
//  语义理解模块 — 纯JS实现，零外部依赖
// ============================================================

/**
 * 英文 activityType → 中文分类名的映射
 * parseScheduleIntent 返回英文，classifySchedule 用它加权
 */
const ACTIVITY_TYPE_TO_CATEGORY = {
  travel: 'travel',
  fitness: 'fitness',
  meeting: 'meeting',
  study: 'study',
  social: 'social',
  health: 'health',
  life: 'life',
};

/**
 * 句式模式库 — 7大场景的句式特征正则
 * 每个场景含多个句式，命中越多置信度越高
 */
const SENTENCE_PATTERNS = {
  travel: [
    /去(.{2,6})出差/,
    /去(.{2,6})旅行/,
    /飞(.{2,6})/,
    /坐(?:高铁|飞机|火车)去(.{2,6})/,
    /到(.{2,6})旅游/,
    /订了?(?:机票|酒店|火车票)/,
  ],
  fitness: [
    /(?:去|到)?健身/,
    /(?:跑|慢跑|长跑)(\d+)(?:公里|km)/,
    /打(?:球|篮球|羽毛球|乒乓球|网球)/,
    /游泳|瑜伽|骑行|举铁|撸铁/,
    /(?:做|练)(\d+)?组/,
    /私教课|有氧|无氧/,
  ],
  meeting: [
    /(?:开|参加|出席|主持)(?:个?会|会议|例会|周会|评审|答辩)/,
    /(?:和|跟|与)(.{2,4})(?:开会|讨论|对|沟通|碰|对齐)/,
    /(?:上午|下午|晚上|明天|后天|今天)?(\d{1,2})(?:点|：)(?:开会|会议|面试|汇报)/,
    /汇报|演示|提案|上线|复盘/,
  ],
  study: [
    /(?:学|学习|复习|备考|准备)(.{2,6})(?:考试|课程|科目)/,
    /刷\d*道?题|刷题|做题/,
    /看书|上课|听课|培训/,
    /(?:看|读)(?:书|教材|论文|文献)/,
    /考证|编程|写代码|网课/,
    /笔记|做笔记|整理笔记/,
  ],
  social: [
    /(?:和|跟|与|约了?)(.{2,4})(?:吃饭|聚会|见面|逛街|看电影|喝|玩)/,
    /聚会|派对|饭局|约饭|生日|婚礼|团建/,
    /请(?:大家|朋友|同事|同学)(?:吃饭|喝|玩)/,
    /唱K|下午茶|逛/,
  ],
  health: [
    /体检|体检中心/,
    /看(?:病|医生|中医|牙医)/,
    /挂号|复查|复诊/,
    /按摩|针灸|理疗|推拿/,
    /养生|冥想|心理/,
    /吃药|服药|打针/,
  ],
  life: [
    /搬家|租房|买房|签合同/,
    /缴费|交费|办理|办证/,
    /取快递|拿快递|快递/,
    /去(?:银行|超市|菜市场|商场)/,
    /打扫|收拾|整理|修理/,
    /理发|剪头发|做头发/,
  ],
};

/**
 * 地点提取正则 — 匹配中文地名/场所
 */
const LOCATION_REGEX = /(?:去|到|在|飞|前往|抵达|到达)([\u4e00-\u9fa5]{2,8})(?:市|省|区|县|镇|路|街|大厦|中心|广场|酒店|机场|站|医院|银行|公园|商场|餐厅)?/g;

/**
 * 人名提取正则 — 匹配"和/跟/与/约了"后的人名
 * 采用非贪婪匹配 {2,4}?，配合动作词边界避免过度捕获
 */
const PEOPLE_REGEX = /(?:和|跟|与|约了?)([\u4e00-\u9fa5]{2,4}?)(?:一起|去|吃饭|聚会|见面|开会|讨论|玩|逛街|看电影)/g;

/**
 * 时长提取正则 — 匹配 "X天/X小时/X分钟/X周"
 */
const DURATION_REGEX = /(\d+)\s*(?:天|日|小时|个?小时|分钟|周|个?星期|个月)/g;

/**
 * 紧急性检测关键词
 */
const URGENCY_KEYWORDS = ['紧急', '加急', '尽快', '马上', '立即', 'deadline', '截止', '最后期限', 'important', 'urgent', 'asap'];

// ============================================================
//  语义解析核心函数
// ============================================================

/**
 * parseScheduleIntent — 从自然语言文本中提取结构化语义信息
 *
 * @param {string} text - 日程的标题+内容文本
 * @returns {{ activityType: string|null, locations: string[], people: string[],
 *             durationHint: string|null, isUrgent: boolean, confidence: number }}
 */
function parseScheduleIntent(text) {
  if (!text) {
    return { activityType: null, locations: [], people: [], durationHint: null, isUrgent: false, confidence: 0 };
  }

  const result = {
    activityType: null,
    locations: [],
    people: [],
    durationHint: null,
    isUrgent: false,
    confidence: 0,
  };

  // ---- 1. 句式模式匹配（确定活动类型 + 置信度） ----
  const typeHits = {};
  let totalPatternHits = 0;

  for (const [activityType, patterns] of Object.entries(SENTENCE_PATTERNS)) {
    let hits = 0;
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        hits++;
      }
    }
    if (hits > 0) {
      typeHits[activityType] = hits;
      totalPatternHits += hits;
    }
  }

  // 命中数最多的类型为推断结果
  if (Object.keys(typeHits).length > 0) {
    result.activityType = Object.entries(typeHits).sort((a, b) => b[1] - a[1])[0][0];
  }

  // 置信度 = min(命中句式数 / 3, 1.0)，3个以上即为满分
  result.confidence = Math.min(totalPatternHits / 3, 1.0);

  // ---- 2. 实体提取：地点 ----
  const locMatches = text.matchAll(LOCATION_REGEX);
  const seenLocs = new Set();
  for (const m of locMatches) {
    const loc = (m[1] + (m[2] || '')).trim();
    if (loc.length >= 2 && loc.length <= 12 && !seenLocs.has(loc)) {
      seenLocs.add(loc);
      result.locations.push(loc);
    }
  }

  // ---- 3. 实体提取：人物 ----
  const pplMatches = text.matchAll(PEOPLE_REGEX);
  const seenPeople = new Set();
  for (const m of pplMatches) {
    const person = m[1].trim();
    // 过滤掉常见非人名词
    const nonPersonWords = ['一起', '大家', '朋友', '同事', '同学', '家人', '他们', '她们', '一个'];
    if (person.length >= 2 && !nonPersonWords.includes(person) && !seenPeople.has(person)) {
      seenPeople.add(person);
      result.people.push(person);
    }
  }

  // ---- 4. 实体提取：时长 ----
  const durMatches = text.matchAll(DURATION_REGEX);
  for (const m of durMatches) {
    result.durationHint = m[0].trim();
    break; // 只取第一个时长
  }

  // ---- 5. 紧急性检测 ----
  result.isUrgent = URGENCY_KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()));

  return result;
}

/**
 * resolveRelativeDate — 将相对日期表达式转为绝对日期
 *
 * 支持：今天/明天/后天/大后天/下周X/下下周X
 *
 * @param {string} text - 包含相对日期表达式的文本
 * @param {Date} [referenceDate] - 参考日期，默认今天
 * @returns {{ resolved: Date|null, expression: string|null }}
 */
function resolveRelativeDate(text, referenceDate) {
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  ref.setHours(0, 0, 0, 0);

  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

  // 今天
  if (/今天/.test(text)) {
    return { resolved: new Date(ref), expression: '今天' };
  }

  // 大后天 — 必须先匹配，避免"后天"子串匹配
  if (/大后天/.test(text)) {
    const d = new Date(ref);
    d.setDate(d.getDate() + 3);
    return { resolved: d, expression: '大后天' };
  }

  // 后天
  if (/后天|后日/.test(text)) {
    const d = new Date(ref);
    d.setDate(d.getDate() + 2);
    return { resolved: d, expression: '后天' };
  }

  // 明天（放在后天之后，避免"后天"中的"天"干扰，两者不冲突但保持安全顺序）
  if (/明天|明日/.test(text)) {
    const d = new Date(ref);
    d.setDate(d.getDate() + 1);
    return { resolved: d, expression: '明天' };
  }

  // 下下周X / 下下周五 — 必须先于下周X匹配，否则"下周"会截胡
  // 匹配"下下周五"（周+数字连写）或"下下周一"等
  const nnwMatch = text.match(/下下(?:周[一二三四五六日]|周(\S))/);
  if (nnwMatch) {
    const raw = nnwMatch[0].replace('下下', '');
    const dayChar = raw.replace('周', '').replace('星期', '').charAt(0);
    const targetDay = dayNames.indexOf(dayChar);
    if (targetDay >= 0) {
      const todayDay = ref.getDay();
      const daysUntil = ((targetDay + 7 - todayDay) % 7) + 14;
      const d = new Date(ref);
      d.setDate(d.getDate() + daysUntil);
      return { resolved: d, expression: nnwMatch[0] };
    }
  }

  // 下周X — 放在下下周之后
  const nextWeekMatch = text.match(/下周([一二三四五六日])/);
  if (nextWeekMatch) {
    const targetDay = dayNames.indexOf(nextWeekMatch[1]);
    const todayDay = ref.getDay();
    const daysUntil = ((targetDay + 7 - todayDay) % 7) + 7;
    const d = new Date(ref);
    d.setDate(d.getDate() + daysUntil);
    return { resolved: d, expression: `下周${nextWeekMatch[1]}` };
  }

  return { resolved: null, expression: null };
}

// 用户手动修正分类的偏好记录
const userCategoryPreferences = new Map();

/**
 * 根据日程内容自动分类（加权匹配算法）
 * 流程：高权重精确匹配 → 中权重匹配 → 低权重模糊匹配
 * 用户偏好：若存在手动修正记录，赋予额外加分
 */
function classifySchedule(title, content, userId) {
  const text = `${title} ${content}`.toLowerCase();

  let bestCategory = 'general';
  let bestScore = 0;
  const scores = {};

  // 第一阶段：高权重关键词精确匹配（100分）
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    if (key === 'general') continue;
    let score = 0;

    for (const kw of cat.keywords.high) {
      if (text.includes(kw.toLowerCase())) score += 100;
    }
    for (const kw of cat.keywords.medium) {
      if (text.includes(kw.toLowerCase())) score += 60;
    }
    for (const kw of cat.keywords.low) {
      if (text.includes(kw.toLowerCase())) score += 30;
    }

    scores[key] = score;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = key;
    }
  }

  // 第二阶段：无匹配时用模糊搜索兜底（降低阈值：30分即可命中中权重）
  if (bestScore === 0) {
    for (const [key, cat] of Object.entries(CATEGORIES)) {
      if (key === 'general') continue;
      let score = 0;

      for (const kw of [...cat.keywords.high, ...cat.keywords.medium]) {
        if (text.includes(kw.toLowerCase())) score += 10;
      }
      if (score > bestScore) {
        bestScore = score;
        bestCategory = key;
      }
    }
  }

  // 第三阶段：语义理解加权 — parseScheduleIntent 推断类型 +150分
  const intent = parseScheduleIntent(text);
  if (intent.activityType && ACTIVITY_TYPE_TO_CATEGORY[intent.activityType]) {
    const intentCat = ACTIVITY_TYPE_TO_CATEGORY[intent.activityType];
    scores[intentCat] = (scores[intentCat] || 0) + 150;
    // 高置信度（>0.7）额外 +50 分
    if (intent.confidence > 0.7) {
      scores[intentCat] = (scores[intentCat] || 0) + 50;
    }
    // 重新评估最佳分类
    for (const [key, score] of Object.entries(scores)) {
      if (key !== 'general' && score > bestScore) {
        bestScore = score;
        bestCategory = key;
      }
    }
  }

  // 第四阶段：用户偏好加分（手动修正过的分类优先级提升）
  if (userId && userCategoryPreferences.has(userId)) {
    const preferred = userCategoryPreferences.get(userId);
    if (scores[preferred] !== undefined && scores[preferred] > 0) {
      // 偏好分类得分接近最佳时，优先选择
      if (scores[preferred] >= bestScore * 0.7) {
        bestCategory = preferred;
        bestScore = scores[preferred];
      }
    }
  }

  return {
    category: bestCategory,
    categoryName: CATEGORIES[bestCategory].name,
    icon: CATEGORIES[bestCategory].icon,
    color: CATEGORIES[bestCategory].color,
  };
}

/**
 * 记录用户手动分类修正偏好
 */
function recordUserCategoryChoice(userId, chosenCategory) {
  if (!userId || !CATEGORIES[chosenCategory]) return;
  userCategoryPreferences.set(userId, chosenCategory);
}

/**
 * AI提示词模板 - 按日程分类定制
 */
const PROMPT_TEMPLATES = {
  travel: `你是一位资深的旅行规划师和本地向导，拥有丰富的出行策划经验。

用户即将进行一次出差/旅行，请根据用户提供的日程信息，提供专业、实用的建议。

输出要求：
1. 【时间规划】给出具体的时间安排建议（提前多久出发、各环节时间分配、高峰避让提醒）
2. 【实用攻略】针对目的地，提供100-200字的实用建议，包括：
   - 必去景点或值得体验的地方
   - 当地特色美食推荐（具体店名或菜品更好）
   - 交通出行tips（当地用什么交通方便）
   - 天气提醒和穿衣建议
3. 【必备清单】列出3-5项出行必备物品提醒
4. 【注意事项】当地风俗、安全提醒等

格式要求：简洁实用，分板块输出，语气亲切专业，像一位贴心的本地朋友。`,

  fitness: `你是一位国家认证的专业健身教练和营养顾问。

用户计划进行一次健身/运动，请根据用户提供的日程信息，提供专业的训练和饮食建议。

输出要求：
1. 【训练计划】根据运动类型，给出具体的时间分配建议（热身X分钟 + 主训练X分钟 + 拉伸X分钟）
2. 【训练要点】100-200字的专业指导，包括：
   - 正确动作要领和常见错误
   - 当天训练重点和强度建议
   - 组数、次数等具体参数
3. 【饮食建议】运动前后的饮食推荐（具体食物和摄入时间）
4. 【注意事项】补水提醒、休息建议、预防受伤等

格式要求：科学专业但易于理解，有具体的数字和时间，不要泛泛而谈。`,

  meeting: `你是一位资深的会议效率顾问和企业管理专家。

用户即将参加一个重要会议/工作安排，请提供高效的工作建议。

输出要求：
1. 【会前准备】列出3-5项需要提前准备的内容（资料、数据、方案等）
2. 【议程建议】100-200字的建议，包括：
   - 会议时间分配建议（各环节多长时间）
   - 关键讨论要点提醒
   - 可能的难点和应对策略
3. 【沟通技巧】针对性的沟通和表达建议
4. 【会后跟进】会后需要做什么的建议

格式要求：实用高效，直击要点，帮助用户在会议中表现出色。`,

  study: `你是一位经验丰富的学习方法论专家和教育顾问。

用户计划进行学习/备考，请提供高效的学习建议。

输出要求：
1. 【学习计划】给出具体的时间分配和学习节奏建议
2. 【学习方法】100-200字的学习策略，包括：
   - 针对该类学习内容的高效方法（如费曼学习法、间隔重复等）
   - 学习重点和容易忽略的知识点
3. 【学习资源】推荐相关的学习资源（书籍、视频、工具等）
4. 【心态建议】保持专注、避免拖延的小技巧

格式要求：科学实用，有具体的可执行建议，帮助用户事半功倍。`,

  social: `你是一位社交达人和活动策划专家。

用户即将参加社交活动，请提供贴心的社交建议。

输出要求：
1. 【着装建议】根据场合推荐的穿搭风格
2. 【社交攻略】100-200字的建议，包括：
   - 聊什么话题比较合适
   - 礼仪注意事项
   - 如何给人留下好印象
3. 【礼物建议】是否需要带礼物、带什么合适
4. 【时间把控】建议到达时间和离开时机

格式要求：温暖贴心，考虑周到，让用户在社交场合自信从容。`,

  life: `你是一位生活管理专家和效率顾问。

用户有日常事务需要处理，请提供高效的生活建议。

输出要求：
1. 【时间安排】给事务分配合理的时间
2. 【实用建议】100-200字的具体建议，包括：
   - 如何更高效地完成这件事
   - 有什么省时省力的小技巧
   - 相关的注意事项
3. 【省钱tips】如有可省钱的地方请指出
4. 【后续提醒】完成后需要注意的后续事项

格式要求：实用接地气，解决实际问题，像一位有经验的生活管家。`,

  health: `你是一位专业的健康管理顾问。

用户有健康相关安排，请提供专业的健康建议。

输出要求：
1. 【事前准备】需要做什么准备（空腹、带什么资料等）
2. 【健康建议】100-200字，包括：
   - 该健康事项的重要性和注意事项
   - 配合建议（饮食、作息等）
   - 常见误区提醒
3. 【后续保养】做完后的保养和跟进建议
4. 【预防建议】长期预防相关健康问题的建议

格式要求：专业可信赖，温暖关怀，帮用户建立健康意识。`,

  general: `你是一位全能的个人助理和生活顾问。

用户有以下日程安排，请根据内容提供最实用、最贴心的建议。

输出要求：
1. 【时间规划】帮助用户合理安排时间
2. 【核心建议】100-200字的实用建议，根据日程内容灵活发挥
3. 【实用提示】2-3条额外的小贴士
4. 【提醒事项】需要注意的关键事项

格式要求：聪明实用，像一位万能的私人助理。`,
};

/**
 * 调用AI生成建议（使用OpenRouter API）
 */
async function generateSuggestion(scheduleData) {
  const { title, content, category, scheduleDate } = scheduleData;
  const fullText = `${title} ${content || ''}`;
  const promptTemplate = PROMPT_TEMPLATES[category] || PROMPT_TEMPLATES.general;

  // 语义解析：提取结构化上下文
  const intent = parseScheduleIntent(fullText);

  const systemPrompt = `${promptTemplate}

重要：请严格按照输出要求中的分板块格式输出，每个板块用【板块名】开头。
建议内容控制在100-200字之间，言简意赅，直击要点。
不要输出与日程无关的内容，不要过度延伸。`;

  // 构建富上下文的用户消息
  let userMessage = `我的日程是：${title}`;

  // 嵌入地点信息
  if (intent.locations.length > 0) {
    userMessage += `\n地点：${intent.locations.join('、')}`;
  }

  // 嵌入参与人
  if (intent.people.length > 0) {
    userMessage += `\n参与人：${intent.people.join('、')}`;
  }

  // 嵌入详细内容
  if (content) {
    userMessage += `\n详细内容：${content}`;
  }

  // 嵌入时长提示
  if (intent.durationHint) {
    userMessage += `\n预计时长：${intent.durationHint}`;
  }

  // 日期推算（如日程日期为相对日期）
  if (scheduleDate) {
    const relative = resolveRelativeDate(scheduleDate);
    if (relative.resolved) {
      const y = relative.resolved.getFullYear();
      const m = String(relative.resolved.getMonth() + 1).padStart(2, '0');
      const d = String(relative.resolved.getDate()).padStart(2, '0');
      const weekDay = ['日', '一', '二', '三', '四', '五', '六'][relative.resolved.getDay()];
      userMessage += `\n推算日期：${y}年${m}月${d}日（周${weekDay}）`;
    }
  }

  // 紧急标记
  if (intent.isUrgent) {
    userMessage += '\n⚠️ 此日程标记为紧急，请提高建议的紧迫性和可执行性。';
  }

  // 出差场景：附加旅行上下文
  if (category === 'travel' && intent.locations.length > 0) {
    userMessage += `\n\n出行提示：目的地"${intent.locations[0]}"，请提醒查询当地天气、交通状况，并给出实用的出行建议。`;
  }

  userMessage += '\n\n请根据以上信息，为我提供专业的建议和规划。';

  if (!config.ai.apiKey) {
    // 没有API Key时返回模拟建议
    return getMockSuggestion(category, title, content);
  }

  try {
    const response = await fetch(`${config.ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.ai.apiKey}`,
        'HTTP-Referer': 'https://ai-calendar-miniapp.com',
        'X-Title': 'AI Smart Calendar',
      },
      body: JSON.stringify({
        model: config.ai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: config.ai.maxTokens,
        temperature: config.ai.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || '';

    return {
      content: aiContent,
      rawResponse: data,
    };
  } catch (err) {
    console.error('AI生成建议失败:', err.message);
    return getMockSuggestion(category, title, content);
  }
}

/**
 * 当AI不可用时的模拟建议（降级方案）
 */
function getMockSuggestion(category, title, content) {
  const mockSuggestions = {
    travel: {
      content: `【时间规划】
建议提前2小时出发，避开早晚高峰。到达后先办理入住，下午可安排轻松游览。

【实用攻略】
${title}是一个值得探索的目的地。建议提前下载离线地图，当地公共交通很方便。必尝当地特色小吃，很多隐藏在巷子里的小店比网红店更正宗。记得查看当地天气，备好合适衣物和舒适的步行鞋。

【必备清单】
- 身份证/护照
- 充电宝和数据线
- 常用药品（感冒药、肠胃药）
- 防晒用品

【注意事项】
注意保管随身财物，提前了解当地风俗习惯。`,
      tips: ['提前查看天气', '下载离线地图', '准备现金零钱'],
      timePlan: [{ time: '出发前2小时', action: '检查行李、确认交通方式' }, { time: '旅途中', action: '放松心情、享受旅程' }],
    },
    fitness: {
      content: `【训练计划】
热身10分钟（动态拉伸+轻有氧）→ 主训练40分钟 → 拉伸放松10分钟。

【训练要点】
今天训练重点在于动作质量和节奏控制。保持核心收紧，呼吸配合动作节奏。新手建议从低强度开始，每组之间休息60秒。注意感受肌肉发力，而不是追求重量。

【饮食建议】
训练前1小时：一根香蕉或全麦面包
训练后30分钟内：补充蛋白质（鸡蛋/蛋白粉/鸡胸肉）+ 适量碳水
全天保持充足饮水，至少2L

【注意事项】
训练前充分热身，避免受伤。如有不适应立即停止，循序渐进比逞强更重要。`,
      tips: ['热身要充分', '补水要及时', '动作要标准'],
      timePlan: [{ time: '运动前1小时', action: '适量进食，补充能量' }, { time: '运动后30分钟', action: '补充蛋白质，帮助恢复' }],
    },
    meeting: {
      content: `【会前准备】
- 梳理会议议程和关键数据
- 准备简洁汇报材料（PPT/文档）
- 预想可能的问题和应对方案
- 确认参会人员和时间地点

【议程建议】
会议时间分配建议：开场5分钟明确目标，主体讨论占比60%，总结和行动计划占15%。关键是每个议题要有明确的结论和负责人。提前发送议程给参会者，让大家有备而来。

【沟通技巧】
用数据和事实说话，避免主观判断。先说结论再展开，节省大家时间。遇到分歧时先认可对方观点再提出补充。

【会后跟进】
24小时内发送会议纪要，明确Action Items和Deadline。`,
      tips: ['提前10分钟到场', '带笔记本记录', '明确自己要达成的目标'],
      timePlan: [{ time: '会前30分钟', action: '回顾议程，整理思路' }, { time: '会后24小时内', action: '发送会议纪要，跟进待办' }],
    },
    study: {
      content: `【学习计划】
建议采用番茄工作法：25分钟专注学习 + 5分钟休息，4个番茄钟后休息15-20分钟。今天安排2-3个学习区块即可。

【学习方法】
推荐费曼学习法：试着把学到的内容讲给别人听，能讲清楚才算真懂了。做笔记时用思维导图代替线性笔记，更容易建立知识框架。重点概念用自己的话复述一遍。

【学习资源】
B站/YouTube搜索相关教学视频，Coursera/中国大学MOOC有系统课程。善用AI工具辅助理解复杂概念。

【心态建议】
先完成再完美。今天的目标是理解核心概念，而不是记住所有细节。`,
      tips: ['关掉手机通知', '准备水和零食', '设置明确的今日目标'],
      timePlan: [{ time: '学习前5分钟', action: '回顾上次内容，明确今日目标' }, { time: '学习后', action: '做5道练习题检验效果' }],
    },
    social: {
      content: `【着装建议】
根据场合选择合适着装，比日常稍正式不会出错。干净整洁是第一要务，细节体现品味。

【社交攻略】
主动做第一个打招呼的人，破冰效果很好。多听少说，用开放式问题引导对方分享。记住几个最近的趣味话题（电影、旅行、美食）作为谈资储备。真诚的微笑是最好的社交货币。

【礼物建议】
如果是朋友聚会带点小零食或饮品即可，心意比价值重要。事先了解是否有人有饮食禁忌。

【时间把控】
准时到达（不要太早也不要太晚），观察气氛选择合适时机告别。`,
      tips: ['记住对方名字', '保持手机静音', '提前了解聚会主题'],
      timePlan: [{ time: '出发前30分钟', action: '整理仪表，确认地点交通' }, { time: '到场后', action: '主动打招呼，融入氛围' }],
    },
    life: {
      content: `【时间安排】
建议把这件事安排在精力最好的时段处理，预留充足时间，不要赶。

【实用建议】
提前列出需要准备的东西和步骤，避免遗漏。善用手机备忘录和提醒功能。如果涉及跑多个地方，按路线规划顺序，少走冤枉路。

【省钱tips】
货比三家，线上先查价格再决定。很多服务提前预约有优惠。

【后续提醒】
完成后及时记录和整理，下次再做同样的事就有经验了。`,
      tips: ['列出清单逐项完成', '提前了解营业时间', '准备好所需证件'],
      timePlan: [{ time: '前一天', action: '列出待办清单和所需物品' }, { time: '完成后', action: '记录经验，方便下次' }],
    },
    health: {
      content: `【事前准备】
确认是否需要空腹、带什么检查报告或证件。穿宽松舒适的衣服方便检查。

【健康建议】
定期体检是预防疾病最有效的方式。重点关注血压、血糖、血脂等基础指标。如果之前有异常指标，这次重点复查。看中医的话准备好描述症状（什么时候开始、什么感觉、什么情况下加重/缓解）。

【后续保养】
根据结果调整饮食和作息。小问题不要拖，早发现早处理。建立健康档案，每次检查结果留底对比。

【预防建议】
保持规律作息，每周至少150分钟中等强度运动。饮食少油少盐多蔬果。`,
      tips: ['带齐检查报告', '空腹前往', '穿宽松衣物'],
      timePlan: [{ time: '前一天晚上', action: '早睡，不吃油腻食物，如需要则禁食' }, { time: '拿到结果后', action: '咨询医生，制定改善计划' }],
    },
    general: {
      content: `【时间规划】
合理安排时间，为这个日程预留充分的准备和执行时间。

【核心建议】
${title}是一个重要的安排。建议提前做好准备，列出关键步骤逐一完成。保持灵活应变的心态，计划赶不上变化时要及时调整。

【实用提示】
- 手机设置提醒，避免忘记
- 提前确认相关安排是否就绪
- 预留备用方案

【提醒事项】
关注关键时间节点，做好备忘记录。`,
      tips: ['设置提醒', '提前准备', '保持灵活'],
      timePlan: [{ time: '提前准备', action: '确认关键事项和所需物品' }],
    },
  };

  const mock = mockSuggestions[category] || mockSuggestions.general;
  return mock;
}

module.exports = {
  classifySchedule,
  generateSuggestion,
  recordUserCategoryChoice,
  parseScheduleIntent,
  resolveRelativeDate,
  CATEGORIES,
};
