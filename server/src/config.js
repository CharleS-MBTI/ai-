require('dotenv').config();

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少必需的环境变量: ${name}`);
  }
  return value;
}

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    path: process.env.DB_PATH || './data/calendar.db',
  },

  jwt: {
    secret: requiredEnv('JWT_SECRET'),
    expiresIn: '7d',
  },

  wx: {
    appId: process.env.WX_APPID || '',
    secret: process.env.WX_SECRET || '',
  },

  ai: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '600', 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    baseUrl: 'https://openrouter.ai/api/v1',
  },
};

module.exports = config;
