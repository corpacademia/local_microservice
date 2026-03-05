const {Pool} = require('pg');

require('dotenv').config();

const pool = new Pool({
    user:process.env.USER,
    database:process.env.DATABASE,
    password:process.env.PASSWORD,
    port:process.env.DATABASE_PORT,
    host:process.env.HOST,
    ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;