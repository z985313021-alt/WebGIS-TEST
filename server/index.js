// 轻量后端：天地图 WMTS 代理 + 数据转换/体检（T4）+ 点赞/评论（T11）
import express from 'express';
import dotenv from 'dotenv';
import https from 'node:https';
import zlib from 'node:zlib';
import multer from 'multer';
import { extname } from 'node:path';
import { convertShpToGeojson, convertExcelToGeojson, healthCheck, UPLOAD_DIR } from './scripts/upload-utils.mjs';
import { getLikeCount, addLike, getComments, addComment } from './scripts/comment-db.mjs';
import { createTemplate, generateHealthReportExcel } from './scripts/data-manage.mjs';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
const TIANDITU_TK = process.env.TIANDITU_TK || '';
const TDT_SUBDOMAINS = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'];
const TDT_TYPES = ['vec_w', 'img_w', 'cva_w', 'cia_w', 'vec_c', 'img_c', 'cva_c', 'cia_c'];
const TDT_LAYER = {
  vec_w: 'vec', img_w: 'img', cva_w: 'cva', cia_w: 'cia',
  vec_c: 'vec', img_c: 'img', cva_c: 'cva', cia_c: 'cia',
};
/** 由类型推断瓦片矩阵集：c 集(3857) / w 集(4326) */
const TDT_MATRIXSET = (type) => (type.endsWith('_c') ? 'c' : 'w');

// 保留原始扩展名（shapefile/xlsx 靠扩展名识别文件类型）
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024, files: 8 },
});

app.use(express.json({ limit: '50mb' }));

const tdtConfigured = () => !!TIANDITU_TK && TIANDITU_TK !== '{{TIANDITU_TK}}';

// 天地图配置状态：前端据此决定用 WMTS 还是 OSM 兜底
app.get('/api/tianditu/status', (req, res) => {
  res.json({ configured: tdtConfigured() });
});

// 天地图 DataServer XYZ 代理：/api/tianditu/xyz/:type/:z/:x/:y
// 标准 Web Mercator 切片网格（与 OSM 一致），type 如 vec_w/cva_w/img_w
// 前端不携带 tk，由本代理拼接 tk 回源，避免密钥暴露
app.get('/api/tianditu/xyz/:type/:z/:x/:y', (req, res) => {
  const { type, z, x, y } = req.params;
  if (!TDT_TYPES.includes(type)) {
    return res.status(400).json({ msg: `invalid type, allowed: ${TDT_TYPES.join(', ')}` });
  }
  if (!tdtConfigured()) {
    return res.status(503).json({ msg: 'TIANDITU_TK not configured, see .env' });
  }
  const sub = TDT_SUBDOMAINS[Math.floor(Math.random() * TDT_SUBDOMAINS.length)];
  const upstream = `https://${sub}.tianditu.gov.cn/DataServer?T=${type}&x=${x}&y=${y}&l=${z}&tk=${TIANDITU_TK}`;

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

// 天地图 WMTS 代理：/api/tianditu/:type?<WMTS KVP 参数>（保留兼容旧 w 集用法）
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
    tilematrixset: TDT_MATRIXSET(type),
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

// ============ T4 数据转换与体检 ============

// 模板下载：Excel / GeoJSON / SHP
app.get('/api/template/:type', (req, res) => {
  try {
    const type = String(req.params.type || '').toLowerCase();
    if (!['excel', 'geojson', 'shp'].includes(type)) {
      return res.status(400).json({ msg: 'invalid type, allowed: excel, geojson, shp' });
    }
    const { buffer, filename, contentType } = createTemplate(type);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

// Shapefile 上传 → GeoJSON（shp/dbf 必传，GBK 解码）
app.post('/api/convert/shp', upload.array('files'), async (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) return res.status(400).json({ msg: '未收到文件' });
    const geojson = await convertShpToGeojson(files);
    res.json(geojson);
  } catch (e) {
    res.status(400).json({ msg: e.message });
  }
});

// Excel 上传 → 点 GeoJSON（lng/lat 列名经表单字段指定）
app.post('/api/convert/excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: '未收到 Excel 文件' });
    const { lngColumn, latColumn, nameColumn } = req.body;
    if (!lngColumn || !latColumn) return res.status(400).json({ msg: '请指定经度/纬度列名' });
    const geojson = await convertExcelToGeojson(req.file.path, { lngColumn, latColumn, nameColumn });
    res.json(geojson);
  } catch (e) {
    res.status(400).json({ msg: e.message });
  }
});

// 数据体检：提交 GeoJSON，返回质量报告
app.post('/api/health-check', (req, res) => {
  try {
    const report = healthCheck(req.body);
    res.json(report);
  } catch (e) {
    res.status(400).json({ msg: e.message });
  }
});

// 体检报告导出 Excel
app.post('/api/health-check/export', (req, res) => {
  try {
    const report = healthCheck(req.body);
    const { buffer, filename } = generateHealthReportExcel(report);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (e) {
    res.status(400).json({ msg: e.message });
  }
});

// ============ T11 点赞 / 评论（SQLite） ============

const parseItemId = (raw) => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
};

// 点赞数
app.get('/api/likes/:id', (req, res) => {
  const id = parseItemId(req.params.id);
  if (id === null) return res.status(400).json({ msg: '无效的 id' });
  res.json({ itemId: id, count: getLikeCount(id) });
});

// 点赞 +1
app.post('/api/likes/:id', (req, res) => {
  const id = parseItemId(req.params.id);
  if (id === null) return res.status(400).json({ msg: '无效的 id' });
  res.json({ itemId: id, count: addLike(id) });
});

// 评论列表
app.get('/api/comments/:id', (req, res) => {
  const id = parseItemId(req.params.id);
  if (id === null) return res.status(400).json({ msg: '无效的 id' });
  res.json({ itemId: id, comments: getComments(id) });
});

// 发表评论
app.post('/api/comments/:id', (req, res) => {
  const id = parseItemId(req.params.id);
  if (id === null) return res.status(400).json({ msg: '无效的 id' });
  const { nickname, content } = req.body ?? {};
  try {
    res.json({ itemId: id, comment: addComment(id, nickname, content) });
  } catch (e) {
    res.status(400).json({ msg: e.message });
  }
});

// ============ WMS 服务接入探测 ============
// 代理 GetCapabilities：支持 gzip 解压、大小限制、超时、重定向跟随
app.get('/api/wms/capabilities', (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ msg: '缺少 url 参数' });
  if (typeof url !== 'string' || url.length > 2000) return res.status(400).json({ msg: 'url 参数无效' });

  const MAX_BYTES = 3 * 1024 * 1024; // 3MB 上限，防超大 XML
  const TIMEOUT_MS = 15000;

  const fetchCapabilities = (targetUrl, redirectsLeft = 3) => {
    const parsed = new URL(targetUrl);
    parsed.searchParams.set('SERVICE', 'WMS');
    parsed.searchParams.set('REQUEST', 'GetCapabilities');
    parsed.searchParams.set('VERSION', '1.1.1');

    const req = https.get(parsed.toString(), { timeout: TIMEOUT_MS }, (upRes) => {
      // 跟随重定向
      if (upRes.statusCode >= 300 && upRes.statusCode < 400 && upRes.headers.location) {
        upRes.resume();
        if (redirectsLeft <= 0) return res.status(502).json({ msg: 'WMS 重定向次数过多' });
        return fetchCapabilities(new URL(upRes.headers.location, parsed).toString(), redirectsLeft - 1);
      }
      if (upRes.statusCode !== 200) {
        upRes.resume();
        return res.status(502).json({ msg: `WMS 服务返回 ${upRes.statusCode}` });
      }

      let stream = upRes;
      const encoding = (upRes.headers['content-encoding'] || '').toLowerCase();
      if (encoding.includes('gzip')) stream = upRes.pipe(zlib.createGunzip());
      else if (encoding.includes('deflate')) stream = upRes.pipe(zlib.createInflate());

      const chunks = [];
      let total = 0;
      stream.on('data', (chunk) => {
        total += chunk.length;
        if (total > MAX_BYTES) {
          req.destroy();
          return res.status(502).json({ msg: 'WMS GetCapabilities 响应过大' });
        }
        chunks.push(chunk);
      });
      stream.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf8');
        // 逐个 <Layer> 节点解析，只取有 <Name> 的图层（跳过根服务名如 OGC:WMS）
        const layerBlocks = [...data.matchAll(/<Layer\b[^>]*>([\s\S]*?)<\/Layer>/g)].map((m) => m[1]);
        const layers = [];
        for (const block of layerBlocks) {
          const name = block.match(/<Name>([^<]+)<\/Name>/)?.[1];
          if (!name) continue; // 根 Layer 无 Name，跳过
          const title = block.match(/<Title>([^<]+)<\/Title>/)?.[1] || name;
          layers.push({ name, title });
        }
        res.json({ ok: true, url: parsed.toString(), layerCount: layers.length, layers: layers.slice(0, 30) });
      });
      stream.on('error', (err) => res.status(502).json({ msg: 'WMS 响应解析失败', error: err.message }));
    });

    req.on('timeout', () => {
      req.destroy();
      res.status(504).json({ msg: 'WMS 请求超时' });
    });
    req.on('error', (err) => {
      if (!res.headersSent) res.status(502).json({ msg: 'WMS 请求失败', error: err.message });
    });
  };

  try {
    fetchCapabilities(url);
  } catch (e) {
    res.status(400).json({ msg: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  if (!tdtConfigured()) {
    console.warn('[server] 警告：TIANDITU_TK 未配置，天地图底图不可用（前端自动用 OSM 兜底）');
  }
});
