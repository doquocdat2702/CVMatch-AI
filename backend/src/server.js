const env = require('./config/env');
const app = require('./app');

const NLP_MODE_DESCRIPTIONS = {
  hybrid: 'rule + Gemini',
  rule: 'chỉ rule, không gọi Gemini',
};

app.listen(env.PORT, () => {
  console.log(`Server is running at http://localhost:${env.PORT}`);
  console.log(`NLP_MODE=${env.NLP_MODE}: phân tích CV / JD bằng ${NLP_MODE_DESCRIPTIONS[env.NLP_MODE]}`);
});
