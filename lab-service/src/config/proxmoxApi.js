const axios = require('axios');

const PROXMOX_URL = process.env.PROXMOX_URL;
const TOKEN_ID = process.env.PROXMOX_TOKEN_ID;
const TOKEN_SECRET = process.env.PROXMOX_TOKEN_SECRET;


const api = axios.create({
  baseURL: PROXMOX_URL,
  timeout:0,
  headers: {
    Authorization: `PVEAPIToken=${TOKEN_ID}=${TOKEN_SECRET}`
  },
  httpsAgent: new (require("https").Agent)({ rejectUnauthorized: false })
});

module.exports = api;