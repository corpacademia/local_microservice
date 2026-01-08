const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const http = require('http');
const {initSocket} = require('./socket')

dotenv.config();

const app = express();
const server = http.createServer(app);
initSocket(server);
// Middleware
app.use(morgan("dev"));  // Log requests

// ⚠️ Use either express.json() or bodyParser.json(), not both
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

app.use(cookieParser());

// CORS config
const corsOptions = {
  origin: "http://localhost:5173",
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

// Route mounting
app.use('/api/v1/user_ms', require('./routes/user'));
app.use('/api/v1/lab_ms', require('./routes/lab'));
app.use('/api/v1/aws_ms', require('./routes/aws_service'));
app.use('/api/v1/organization_ms', require('./routes/organizations'));
app.use('/api/v1/workspace_ms', require('./routes/workspaces'));
app.use('/api/v1/cloud_slice_ms', require('./routes/cloudSliceService'));
app.use('/api/v1/vmcluster_ms',require('./routes/vmClusterService'));

module.exports = {app,server};
