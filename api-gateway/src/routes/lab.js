const express = require('express');
const { createProxyMiddleware } = require("http-proxy-middleware");
const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();
require('dotenv').config();

//Define public (unauthenticated) route 
router.post("/getAllLabCatalogues", createProxyMiddleware({
  target: process.env.LAB_SERVICE_URL || "http://localhost:3002",
  changeOrigin: true,
  pathRewrite: { "^/api/v1/lab_ms": "" },
  onProxyReq: (proxyReq, req, res) => {
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader("Content-Type", "application/json");
      proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Credentials", "true");
  },
  onError: (err, req, res) => {
    res.status(500).json({ error: "Proxy error", details: err.message });
  },
}));

router.post("/getReviews", createProxyMiddleware({
  target: process.env.LAB_SERVICE_URL || "http://localhost:3002",
  changeOrigin: true,
  pathRewrite: { "^/api/v1/lab_ms": "" },
  onProxyReq: (proxyReq, req, res) => {
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader("Content-Type", "application/json");
      proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Credentials", "true");
  },
  onError: (err, req, res) => {
    res.status(500).json({ error: "Proxy error", details: err.message });
  },
}));
//Define public (unauthenticated) route 
router.post("/getLabOnId", createProxyMiddleware({
  target: process.env.LAB_SERVICE_URL || "http://localhost:3002",
  changeOrigin: true,
  pathRewrite: { "^/api/v1/lab_ms": "" },
  onProxyReq: (proxyReq, req, res) => {
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader("Content-Type", "application/json");
      proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Credentials", "true");
  },
  onError: (err, req, res) => {
    res.status(500).json({ error: "Proxy error", details: err.message });
  },
}));


router.post("/getUserPurchasedSinglvmLabsOnLabId", createProxyMiddleware({
  target: process.env.LAB_SERVICE_URL || "http://localhost:3002",
  changeOrigin: true,
  pathRewrite: { "^/api/v1/lab_ms": "" },
  onProxyReq: (proxyReq, req, res) => {
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader("Content-Type", "application/json");
      proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Credentials", "true");
  },
  onError: (err, req, res) => {
    res.status(500).json({ error: "Proxy error", details: err.message });
  },
}));

router.use(
    "/",verifyToken,
    createProxyMiddleware({
      target: process.env.LAB_SERVICE_URL || "http://localhost:3002",
      changeOrigin: true,
      pathRewrite: { "^/api/v1/lab_ms": "" },
      timeout: 0,
      proxyTimeout: 0,
      
      onProxyReq: (proxyReq, req, res) => {
        console.log(`🛠️ Proxying request to: ${process.env.LAB_SERVICE_URL}${req.url}`);
        
        if (req.is("multipart/form-data")) {
          return;
        }

        // Fix: Convert JSON body to raw buffer and forward
        if (req.body) {
          let bodyData = JSON.stringify(req.body);
          proxyReq.setHeader("Content-Type", "application/json");
          proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      },
  
      onProxyRes: (proxyRes, req, res) => {
        console.log(`✅ Response received from ${process.env.LAB_SERVICE_URL}${req.url} - Status: ${proxyRes.statusCode}`);
        
        res.header("Access-Control-Allow-Origin", "http://localhost:5173");
        res.header("Access-Control-Allow-Credentials", "true");
      },
  
      onError: (err, req, res) => {
        console.error(`❌ Proxy error: ${err.message}`);
        res.status(500).json({ error: "Proxy error", details: err.message });
      },
    })
  );

module.exports = router;

