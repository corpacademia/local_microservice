const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cloudSliceAwsRoute = require('./routes/cloudSliceAwsRoutes');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const app = express();
//config env variables
require('dotenv').config();

//create tables
const tables = require('./db/tables');
tables;

//middlewares
//middlewares
app.use(cors({
    origin:process.env.CORS || 'http://localhost:5173',
    credentials:true,
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json());

//routes
app.use('/',cloudSliceAwsRoute);
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
// app.use('/uploads/:filename', (req, res) => {
//   const filename = req.params.filename;
//   const filePath = path.join(__dirname, 'public', 'uploads', filename);

//   if (fs.existsSync(filePath)) {
//     const mimeType = getMimeType(filename);
//     res.setHeader('Content-Type', mimeType);
//     res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
//     fs.createReadStream(filePath).pipe(res);
//   } else {
//     res.status(404).send('File not found');
//   }
// });

// function getMimeType(filename) {
//   if (filename.endsWith('.pdf')) return 'application/pdf';
//   if (filename.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
//   if (filename.endsWith('.doc')) return 'application/msword';
//   if (filename.endsWith('.txt')) return 'text/plain';
//   // Other types as needed...
//   return 'application/octet-stream';
// }

module.exports = app;
