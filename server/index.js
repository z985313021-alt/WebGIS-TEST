// 轻量后端：天地图 WMTS 代理 + 数据转换/体检（T4）+ 点赞/评论（T11）
import express from 'express';
import dotenv from 'dotenv';
import https from 'node:https';
import zlib from 'node:zlib';
import multer from 'multer';
import { extname } from 'node:path';
import { convertShpToGeojson, convertExcelToGeojson, healthCheck, UPLOAD_DIR } from './scripts/upload-utils.mjs';
import { getLikeCount, addLike, getComments, addComment } from './scripts/comment-db.mjs';
import { registerUser, loginUser, getUserByToken, logoutByToken, getUserById, setUserRole, ensureAdmin, listUsers, rehashPassword } from './scripts/user-db.mjs';
import * as shop from './scripts/shop-db.mjs';
import * as account from './scripts/account-db.mjs';
import { createTemplate, generateHealthReportExcel } from './scripts/data-manage.mjs';
import { searchStations, queryTickets, queryPrices, queryRouteStations, ensureCode, stationName, cityPos } from './scripts/train12306.mjs';

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

// ============ 用户注册（SQLite） ============

// ============ 鉴权工具 ============
function bearerToken(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  return h.slice(7).trim();
}
/** 解析当前登录用户；未登录时返回 null（不抛错） */
function currentUser(req) {
  const token = bearerToken(req);
  return token ? getUserByToken(token) : null;
}
/** 必须登录 */
function requireAuth(req, res, next) {
  const token = bearerToken(req);
  const user = token ? getUserByToken(token) : null;
  if (!user) return res.status(401).json({ msg: '请先登录' });
  req.user = user;
  req.token = token;
  next();
}
/** 必须为管理员 */
function requireAdmin(req, res, next) {
  const token = bearerToken(req);
  const user = token ? getUserByToken(token) : null;
  if (!user) return res.status(401).json({ msg: '请先登录' });
  if (user.role !== 'admin') return res.status(403).json({ msg: '需要管理员权限' });
  req.user = user;
  req.token = token;
  next();
}

// ============ AUTH：注册 / 登录 / 会话 ============

function publicUser(u) {
  if (!u) return null;
  return { id: u.id, username: u.username, email: u.email, role: u.role, createdAt: u.createdAt };
}

// 注册新用户（成功即签发 token：注册后自动进入系统）
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body ?? {};
  try {
    const user = registerUser(username, email, password);
    const sess = loginUser(user.username, password);
    res.json({ ok: true, token: sess.token, user: publicUser(sess.user) });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
  }
});

// 登录：账号 = 用户名或邮箱
app.post('/api/auth/login', (req, res) => {
  const { account, password } = req.body ?? {};
  try {
    const sess = loginUser(account, password);
    res.json({ ok: true, token: sess.token, user: publicUser(sess.user) });
  } catch (e) {
    res.status(e.code === 'BAD_CREDENTIALS' ? 400 : 500).json({ ok: false, msg: e.message });
  }
});

// 当前登录用户
app.get('/api/auth/me', (req, res) => {
  const user = currentUser(req);
  res.json({ ok: true, user: user ? publicUser(user) : null });
});

// 退出登录（使 token 失效）
app.post('/api/auth/logout', (req, res) => {
  const token = bearerToken(req);
  if (token) logoutByToken(token);
  res.json({ ok: true });
});

// 修改密码
app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body ?? {};
  if (!oldPassword || String(newPassword || '').length < 6) {
    return res.status(400).json({ ok: false, msg: '新密码至少 6 位' });
  }
  try {
    loginUser(req.user.username, oldPassword); // 校验原密码
  } catch (e) {
    return res.status(400).json({ ok: false, msg: '原密码不正确' });
  }
  try {
    rehashPassword(Number(req.user.id), newPassword);
    res.json({ ok: true, msg: '密码已更新' });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
  }
});

// 管理员：用户列表
app.get('/api/auth/users', requireAdmin, (req, res) => {
  res.json({ ok: true, users: listUsers() });
});

// 管理员：设置用户角色
app.post('/api/auth/users/:id/role', requireAdmin, (req, res) => {
  try {
    const user = setUserRole(req.params.id, req.body?.role);
    res.json({ ok: true, user: publicUser(user) });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
  }
});

// 引导：若系统尚无任何用户，允许通过默认引导账号快速登录演示
app.post('/api/setup/admin', (req, res) => {
  const { username = 'admin', email = 'admin@webgis.test', password = 'admin123' } = req.body ?? {};
  try {
    const result = ensureAdmin(username, email, password);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
  }
});

// ============ 文创商城：非遗 / 商品 / 购物车 / 订单 ============
const parsePosInt = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };

// 非遗全景（公开，供后台 / 关联用）
app.get('/api/shop/heritage', (req, res) => res.json({ ok: true, items: shop.listHeritage() }));

// 商品分类（公开）
app.get('/api/shop/categories', (req, res) => res.json({ ok: true, categories: shop.productCategories() }));

// 商品列表（公开；?category= 过滤）
app.get('/api/shop/products', (req, res) => {
  const category = String(req.query.category || '');
  res.json({ ok: true, count: shop.listProducts({ category }).length, products: shop.listProducts({ category }) });
});

// 商品详情（公开）
app.get('/api/shop/products/:id', (req, res) => {
  const p = shop.getProductById(req.params.id);
  if (!p) return res.status(404).json({ msg: '商品不存在' });
  if (!p.onSale) return res.status(404).json({ msg: '商品已下架' });
  res.json({ ok: true, product: p });
});

// ---- 购物车（登录） ----
app.get('/api/shop/cart', requireAuth, (req, res) => {
  res.json({
    ok: true,
    items: shop.getCart(req.user.id).map((c) => ({
      productId: c.productId, qty: c.qty, name: c.name, subtitle: c.subtitle,
      price: c.price, image: c.image, stock: c.stock,
    })),
  });
});
app.post('/api/shop/cart', requireAuth, (req, res) => {
  const { productId, qty } = req.body ?? {};
  try {
    const cart = shop.setCartQty(req.user.id, productId, qty);
    res.json({ ok: true, items: cart });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
  }
});
app.delete('/api/shop/cart/:productId', requireAuth, (req, res) => {
  try {
    const items = shop.setCartQty(req.user.id, req.params.productId, 0);
    res.json({ ok: true, items });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
  }
});

// ---- 订单（用户） ----
app.post('/api/shop/orders', requireAuth, (req, res) => {
  const { receiver, phone, address, remark } = req.body ?? {};
  try {
    const order = shop.createOrder(req.user.id, { receiver, phone, address, remark });
    res.json({ ok: true, status: order.status, order: { ...order, statusCn: shop.orderStatusChinese[order.status] || order.status } });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
  }
});
app.get('/api/shop/orders', requireAuth, (req, res) => {
  const orders = shop.getOrdersByUser(req.user.id).map((o) => ({
    ...o, statusCn: shop.orderStatusChinese[o.status] || o.status,
  }));
  res.json({ ok: true, orders });
});
app.post('/api/shop/orders/:orderNo/pay', requireAuth, (req, res) => {
  try {
    const order = shop.payOrder(req.user.id, req.params.orderNo);
    res.json({ ok: true, statusCn: shop.orderStatusChinese[order.status] });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
  }
});
app.post('/api/shop/orders/:orderNo/cancel', requireAuth, (req, res) => {
  try {
    const order = shop.cancelOrder(req.user.id, req.params.orderNo);
    res.json({ ok: true, statusCn: shop.orderStatusChinese[order.status] });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
  }
});
app.post('/api/shop/orders/:orderNo/confirm', requireAuth, (req, res) => {
  try {
    const order = shop.confirmOrder(req.user.id, req.params.orderNo);
    res.json({ ok: true, statusCn: shop.orderStatusChinese[order.status] });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
  }
});

// ---- 订单（管理员：发货 / 数据） ----
app.get('/api/shop/orders/admin', requireAdmin, (req, res) => {
  try {
    const userMap = {}; for (const u of listUsers()) userMap[u.id] = u.username;
    const orders = shop.getAllOrdersRaw().map((o) => ({
      ...o, username: userMap[o.userId] ?? '已注销用户',
      statusCn: shop.orderStatusChinese[o.status] || o.status,
    }));
    res.json({ ok: true, orders, stat: shop.orderStat() });
  } catch (e) {
    res.status(500).json({ ok: false, msg: e.message });
  }
});
app.post('/api/shop/orders/:orderNo/ship', requireAdmin, (req, res) => {
  try {
    shop.shipOrder(req.params.orderNo, req.body?.trackingNo);
    res.json({ ok: true, msg: '已发货' });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
  }
});

// ---- 商品管理（管理员） ----
app.post('/api/shop/products', requireAdmin, (req, res) => {
  try {
    res.json({ ok: true, product: shop.addProduct(req.body) });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
  }
});
app.put('/api/shop/products/:id', requireAdmin, (req, res) => {
  try {
    res.json({ ok: true, product: shop.updateProduct(req.params.id, req.body) });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
  }
});
app.delete('/api/shop/products/:id', requireAdmin, (req, res) => {
  try {
    res.json({ ok: true, ...shop.deleteProduct(req.params.id) });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
  }
});

// 电商订单流转状态汇总中文映射（公开）
app.get('/api/shop/flow', (req, res) => {
  res.json({ ok: true, statusCn: shop.orderStatusChinese });
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

// ============ 个人资料 & 收货地址（account-db） ============

// 读取当前登录用户的资料（含昵称/头像/手机）
app.get('/api/profile/me', requireAuth, (req, res) => {
  const u = account.getPublicUser(req.user.id);
  res.json({ ok: true, profile: u });
});

// 更新资料（可只传要改的字段）
app.put('/api/profile/me', requireAuth, (req, res) => {
  const { nickname, phone, avatarUrl } = req.body ?? {};
  try {
    const profile = account.updateUserProfile(req.user.id, { nickname, phone, avatarUrl });
    res.json({ ok: true, profile });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
  }
});

// 收货地址簿 CRUD
app.get('/api/addresses', requireAuth, (req, res) => {
  res.json({ ok: true, items: account.listAddresses(req.user.id) });
});

app.post('/api/addresses', requireAuth, (req, res) => {
  try {
    const item = account.createAddress(req.user.id, req.body ?? {});
    res.json({ ok: true, item, items: account.listAddresses(req.user.id) });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
  }
});

app.put('/api/addresses/:id', requireAuth, (req, res) => {
  try {
    const item = account.updateAddress(req.user.id, Number(req.params.id), req.body ?? {});
    res.json({ ok: true, item, items: account.listAddresses(req.user.id) });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
  }
});

app.post('/api/addresses/:id/default', requireAuth, (req, res) => {
  try {
    const items = account.setDefaultAddress(req.user.id, Number(req.params.id));
    res.json({ ok: true, items });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
  }
});

app.delete('/api/addresses/:id', requireAuth, (req, res) => {
  try {
    const items = account.deleteAddress(req.user.id, Number(req.params.id));
    res.json({ ok: true, items });
  } catch (e) {
    res.status(400).json({ ok: false, msg: e.message });
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


// ============ 12306 火车查询（旅游路线规划） ============
// 车站搜索（中文/拼音/简拼/三字码）
app.get('/api/train/stations', (req, res) => {
  const q = String(req.query.q || '');
  const limit = Math.min(Number(req.query.limit) || 10, 20);
  if (!q) return res.json({ success: false, error: '请输入关键词' });
  res.json({ success: true, count: searchStations(q, limit).length, stations: searchStations(q, limit) });
});

// 余票 + 时刻查询
app.get('/api/train/tickets', async (req, res) => {
  const { from, to, date } = req.query;
  if (!from || !to || !date) return res.json({ success: false, error: '缺少 from/to/date 参数' });
  try {
    res.json(await queryTickets(String(from), String(to), String(date)));
  } catch (e) {
    res.json({ success: false, error: '查询失败: ' + e.message });
  }
});

// 票价查询
app.get('/api/train/prices', async (req, res) => {
  const { from, to, date } = req.query;
  if (!from || !to || !date) return res.json({ success: false, error: '缺少 from/to/date 参数' });
  try {
    res.json(await queryPrices(String(from), String(to), String(date)));
  } catch (e) {
    res.json({ success: false, error: '查询失败: ' + e.message });
  }
});

// 经停站查询（车次编号 trainNo）
app.get('/api/train/route', async (req, res) => {
  const { trainNo, from, to, date } = req.query;
  if (!trainNo || !from || !to || !date) return res.json({ success: false, error: '缺少参数' });
  try {
    res.json(await queryRouteStations(String(trainNo), String(from), String(to), String(date)));
  } catch (e) {
    res.json({ success: false, error: '查询失败: ' + e.message });
  }
});

// 城市经纬度（地图可视化用）
app.get('/api/train/city-pos', (req, res) => {
  const c = String(req.query.city || '');
  const pos = c ? cityPos(c) : null;
  res.json({ city: c, pos });
});

// 车站编码解析（站名 → 三字码）
app.get('/api/train/station-code', (req, res) => {
  const q = String(req.query.q || '');
  res.json({ name: q, code: ensureCode(q), station: q ? stationName(ensureCode(q) || '') : '' });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  if (!tdtConfigured()) {
    console.warn('[server] 警告：TIANDITU_TK 未配置，天地图底图不可用（前端自动用 OSM 兜底）');
  }
});