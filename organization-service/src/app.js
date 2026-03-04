const express = require('express');
const app =express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const organizationRouter = require('./routes/organizationRoutes');

//tables
const tables = require('./db/organizationTables');
tables;   

//middlewares
app.use(cors({
    origin:process.env.CORS || 'http://localhost:5173',
    credentials:true,
}));
// app.use(express.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({extended:true}));

//Routes
app.use('/',organizationRouter);
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


module.exports = app;