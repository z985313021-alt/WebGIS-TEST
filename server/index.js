// 轻量后端：天地图 WMTS 代理 + 数据转换中转
// 阶段：WMTS 代理已实现；shp/excel 转换为占位（待补全）
import express from 'express';
import dotenv from 'dotenv';
import https from 'node:https';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
const TIANDITU_TK = process.env.TIANDITU_TK || '';
const TDT_SUBDOMAINS = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'];
const TDT_TYPES = ['vec_w', 'img_w', 'cva_w', 'cia_w'];
const TDT_LAYER = { vec_w: 'vec', img_w: 'img', cva_w: 'cva', cia_w: 'cia' };

app.use(express.json({ limit: '50mb' }));

const tdtConfigured = () => !!TIANDITU_TK && TIANDITU_TK !== '{{TIANDITU_TK}}';

// 天地图配置状态：前端据此决定用 WMTS 还是 OSM 兜底
app.get('/api/tianditu/status', (req, res) => {
  res.json({ configured: tdtConfigured() });
});

// 天地图 WMTS 代理：/api/tianditu/:type?<WMTS KVP 参数>
// 前端不携带 tk，由本代理拼接 tk 回源，避免密钥暴露
app.get('/api/tianditu/:type', (req, res) => {
  const type = String(req.params.type || '');
  if (!TDT_TYPES.includes(type)) {
    return res.status(400).json({ msg: `invalid type, allowed: ${TDT_TYPES.join(', ')}` });
  }
  if (!tdtConfigured()) {
    return res.status(503).json({ msg: 'TIANDITU_TK not configured, see .env' });
  }

  const q = req.query;
  // 参数大小写兼容（OpenLayers 用小写，手动请求可能大写）
  const getParam = (name) => {
    if (q[name] !== undefined) return String(q[name]);
    const lower = Object.keys(q).find((k) => k.toLowerCase() === name.toLowerCase());
    return lower !== undefined ? String(q[lower]) : undefined;
  };
  const tilematrix = getParam('tilematrix');
  const tilerow = getParam('tilerow');
  const tilecol = getParam('tilecol');
  if (!tilematrix || !tilerow || !tilecol) {
    return res.status(400).json({ msg: 'missing WMTS params: tilematrix/tilerow/tilecol' });
  }

  // 白名单重建上游参数（丢弃任何传入的 tk，只信环境变量）
  const qs = new URLSearchParams({
    service: 'WMTS',
    request: 'GetTile',
    version: '1.0.0',
    layer: TDT_LAYER[type],
    style: 'default',
    tilematrixset: 'w',
    format: 'tiles',
    tilematrix,
    tilerow,
    tilecol,
    tk: TIANDITU_TK,
  });
  const sub = TDT_SUBDOMAINS[Math.floor(Math.random() * TDT_SUBDOMAINS.length)];
  const upstream = `https://${sub}.tianditu.gov.cn/${type}/wmts?${qs.toString()}`;

  const proxyReq = https.get(upstream, (upRes) => {
    res.status(upRes.statusCode ?? 502);
    res.setHeader('Content-Type', upRes.headers['content-type'] || 'image/tiles');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    upRes.pipe(res);
  });
  proxyReq.on('error', (err) => {
    if (!res.headersSent) res.status(502).json({ msg: 'upstream error', error: err.message });
    else res.end();
  });
});

// Shapefile 转换占位
app.post('/api/convert/shp', (req, res) => {
  res.status(501).json({ msg: 'shp->geojson placeholder, implement with shapefile+dbf' });
});

// Excel 转换占位
app.post('/api/convert/excel', (req, res) => {
  res.status(501).json({ msg: 'excel->geojson placeholder, implement with xlsx' });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  if (!tdtConfigured()) {
    console.warn('[server] 警告：TIANDITU_TK 未配置，天地图底图不可用（前端自动用 OSM 兜底）');
  }
});
