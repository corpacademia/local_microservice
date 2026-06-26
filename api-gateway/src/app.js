const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');
const {initSocket} = require('./socket')

dotenv.config();

const app = express();
const server = http.createServer(app);
initSocket(server);

// Guacamole WebSocket proxy: browser /rdp?token=... -> lab-service:3002 /rdp
// Mounted before body parsers / auth so the upgrade is forwarded cleanly.
// Token in querystring is validated by lab-service via tokenStore (one-time use).
const rdpProxy = createProxyMiddleware({
  target: process.env.LAB_SERVICE_URL || 'http://localhost:3002',
  changeOrigin: true,
  ws: true,
  logLevel: 'warn',
});
app.use('/rdp', rdpProxy);
server.on('upgrade', (req, socket, head) => {
  if (req.url && req.url.startsWith('/rdp')) {
    rdpProxy.upgrade(req, socket, head);
  }
});

// Webhook proxies — Stripe + Cashfree both verify HMAC over the raw request
// body, so we MUST mount these before any JSON body parser (which would
// consume + reformat the bytes and break signature verification).
const webhookProxy = createProxyMiddleware({
  target: process.env.LAB_SERVICE_URL || 'http://localhost:3002',
  changeOrigin: true,
  pathRewrite: { '^/api/v1/lab_ms': '' },
  onProxyRes: (proxyRes, req, res) => {
    res.header('Access-Control-Allow-Origin', process.env.CORS || 'http://localhost:5173');
    res.header('Access-Control-Allow-Credentials', 'true');
  },
  onError: (err, req, res) => {
    res.status(500).json({ error: 'Webhook proxy error', details: err.message });
  },
});
app.use('/api/v1/lab_ms/webhook', webhookProxy);
app.use('/api/v1/lab_ms/cashfree-webhook', webhookProxy);

// Middleware
app.use(morgan("dev"));  // Log requests

// ⚠️ Use either express.json() or bodyParser.json(), not both
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

app.use(cookieParser());

// CORS config
const corsOptions = {
  origin: process.env.CORS || "http://localhost:5173",
  credentials: true,
  methods: "GET, POST,PATCH, PUT, DELETE, OPTIONS",
  allowedHeaders: "Content-Type, Authorization"
};
app.use(cors(corsOptions));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, './uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'src/public/uploads')));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// Route mounting
app.use('/api/v1/user_ms', require('./routes/user'));
app.use('/api/v1/lab_ms', require('./routes/lab'));
app.use('/api/v1/aws_ms', require('./routes/aws_service'));
app.use('/api/v1/organization_ms', require('./routes/organizations'));
app.use('/api/v1/workspace_ms', require('./routes/workspaces'));
app.use('/api/v1/cloud_slice_ms', require('./routes/cloudSliceService'));
app.use('/api/v1/vmcluster_ms',require('./routes/vmClusterService'));

module.exports = {app,server};
