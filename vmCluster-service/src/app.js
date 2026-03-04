const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const clusterRouter = require('./routes/clusterRoutes.js')
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');

const app = express();
require('dotenv').config();
//tables
const tables = require('./dbconfig/clusterTables');
tables;

app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '100mb' }));

app.use(cookieParser());

app.use(cors({
    origin: process.env.CORS || "http://localhost:5173",
    credentials: true,
}));

//routing
app.use('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'public', 'uploads', filename);

  if (fs.existsSync(filePath)) {
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).send('File not found');
  }
});

//routes
app.use('/',clusterRouter);

module.exports = app;