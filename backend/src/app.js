const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const env = require('./config/env');
const routes = require('./routes');
const errorMiddleware = require('./middleware/error.middleware');
const { error } = require('./utils/response');

const app = express();

// Header bảo mật mặc định của helmet
app.use(helmet());
// Trình duyệt chỉ được gọi API từ các origin trong CORS_ORIGIN
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.use('/api', routes);

// Đường dẫn API không tồn tại: trả JSON như mọi lỗi khác, không trả trang HTML của Express (QA-10)
app.use('/api', (req, res) => error(res, 'Không tìm thấy đường dẫn API.', 404));

app.use(errorMiddleware);

module.exports = app;
