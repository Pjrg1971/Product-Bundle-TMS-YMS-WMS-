import { createProxyMiddleware } from 'http-proxy-middleware';
import { Router, Request, Response } from 'express';

const router = Router();

const TMS_URL = process.env.TMS_URL || 'http://localhost:4100';
const WMS_URL = process.env.WMS_URL || 'http://localhost:8000';
const YMS_URL = process.env.YMS_URL || 'http://localhost:4000';

router.use('/api/tms', createProxyMiddleware({
  target: TMS_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/tms': '/api' },
}));

router.use('/api/wms', createProxyMiddleware({
  target: WMS_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/wms': '/api/v1' },
}));

router.use('/api/yms', createProxyMiddleware({
  target: YMS_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/yms': '/api' },
}));

export default router;
