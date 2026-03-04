const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const awsRoutes = require('../src/routes/awsRoutes');
require('dotenv').config();

const app = express();


//middlewares
app.use(cors({
    origin: process.env.CORS || "http://localhost:5173",
    credentials: true
}));
app.use(express.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(cookieParser());

//route to aws-services
app.use('/',awsRoutes);

module.exports = app;

