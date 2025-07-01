const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const authRouter = require('./routes/authRoutes')

const app = express();

//tables
const tables = require('./dbconfig/userTables');
tables;

app.use(express.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.urlencoded({extended:true}));
app.use(bodyParser.json())
app.use(cookieParser());
app.use(cors({
    origin:process.env.FRONTEND_URL || "http://localhost:5173",
    credentials:true,
}));



//routes
app.use('/uploads', express.static('public/uploads'));
app.use('/',authRouter);

module.exports = app;