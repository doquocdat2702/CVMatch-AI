const env = require('./config/env');
const app = require('./app');

app.listen(env.PORT, () => {
  console.log(`Server is running at http://localhost:${env.PORT}`);
});
