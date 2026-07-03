const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookie = require('cookie-parser');
const cookieParser = require('cookie-parser');
const labRouter = require('../src/routes/labRoutes');
const reviewRouter = require('../src/routes/reviewRoutes');
const proxmoxRouter = require('../src/routes/proxmoxRoutes');
const batchRouter = require('../src/routes/batchesRoutes');
const credentialsRouter = require("../src/routes/cloudCredentialsRoutes");
const fetchLabsRouter = require("../src/routes/fetchLabsRoutes");
const purchaseRouter = require("../src/routes/purchaseRoutes");
const subscriptionRouter = require("../src/routes/subscriptionRoutes")
const usageRouter = require("../src/routes/usageRoutes")
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const session = require("express-session");
const {sessionMiddleware} = require('../src/config/session');
require('dotenv').config();

const app = express();
const { handleCashfreeWebhook } = require('./controllers/labCartController'); 

//tables
const tables = require('./db/labTables');
tables;

//middlewares
// Session middleware
// app.use(sessionMiddleware);

// Mount it before any bodyParser middleware
app.use('/webhook', express.raw({ type: 'application/json' }),handleCashfreeWebhook);
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use(cors({
    origin: process.env.CORS || "http://localhost:5173",
    credentials: true
}));
app.use(cookieParser());
// Skip body-parser for multipart/form-data
app.use((req, res, next) => {
  if (req.is('multipart/form-data')) {
    return next(); // skip parsing, let multer/stream handle it
  }
  next();
});


// Serve files from the "generated" folder inside "controllers"
app.use('/generated', express.static(path.join(__dirname, 'controllers')));


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
app.use('/',labRouter);
app.use('/',reviewRouter);
app.use('/',proxmoxRouter);
app.use('/',batchRouter);
app.use('/',credentialsRouter);
app.use('/',fetchLabsRouter);
app.use('/',purchaseRouter);
app.use('/',subscriptionRouter)
app.use('/',usageRouter)




module.exports = {app,sessionMiddleware};