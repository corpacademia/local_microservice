const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookie = require('cookie-parser');
const cookieParser = require('cookie-parser');
const labRouter = require('../src/routes/labRoutes');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');

const app = express();

//tables
const tables = require('./db/labTables');
tables;

//middlewares
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(cookieParser());

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
app.use('/',labRouter);





module.exports = app;