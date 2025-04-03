const {Pool} = require('pg');
require('dotenv').config();


const pool = new Pool({
    host: process.env.HOST,
    port: process.env.DB_PORT,
    database: process.env.DATABASE,
    user: process.env.USER,
    password: process.env.PASSWORD,
});

module.exports = pool;

