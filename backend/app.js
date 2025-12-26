const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const app = express();
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));


app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/user', require('./routes/user.routes'));
app.use("/api/codeforces", require("./routes/codeforces.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));



module.exports = app;
