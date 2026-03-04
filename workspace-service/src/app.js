const express = require('express')
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path  = require('path');
const app =express();
require('dotenv').config();


const workspaceRouter = require('./routes/workspaceRoutes');

//tables
const tables = require('./db/workspaceTables');
 tables;

//middlewares
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(cookieParser());

//router
app.use('/',workspaceRouter);
app.use('/uploads',express.static(path.join(__dirname,'public/uploads')));


module.exports  = app;