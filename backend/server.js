require('dotenv').config();
const app = require('./app');

app.listen(8080, () => {
  console.log('Server running on http://localhost:8080');
});
