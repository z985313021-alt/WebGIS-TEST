// 文创购买系统数据模块：node:sqlite（Node ≥ 22.5 内置）
// 职责：非遗全景数据入库(heritage) + 文创商品(products) + 购物车(cart) + 订单(orders/order_items)
// 与 HTTP 层分离；通过 shop-db 内 seed 逻辑从 heritage.geojson 全量灌入非遗，
// 并用精选 "文创清单" 自动关联非遗生成演示商品（初始库存可后续在后台修改）。
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import fs from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'shop.db');
const GEOJSON_PATH = join(__dirname, '..', 'data', 'heritage.geojson');

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS heritage (
    id           INTEGER PRIMARY KEY,
    name         TEXT NOT NULL,
    category     TEXT,
    city         TEXT,
    district     TEXT,
    area         TEXT,
    protect_unit TEXT,
    year         INTEGER,
    code         TEXT,
    type         TEXT,
    province     TEXT,
    photo        TEXT,
    lng          REAL,
    lat          REAL
  );
  CREATE TABLE IF NOT EXISTS products (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    heritage_id  INTEGER,
    category     TEXT,
    name         TEXT NOT NULL UNIQUE,
    subtitle     TEXT DEFAULT '',
    price        REAL NOT NULL DEFAULT 0,
    stock        INTEGER NOT NULL DEFAULT 0,
    image        TEXT,
    description  TEXT DEFAULT '',
    on_sale      INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (heritage_id) REFERENCES heritage(id)
  );
  CREATE TABLE IF NOT EXISTS cart (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    qty        INTEGER NOT NULL DEFAULT 1,
    added_at   TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE(user_id, product_id)
  );
  CREATE TABLE IF NOT EXISTS orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no      TEXT UNIQUE,
    user_id       INTEGER NOT NULL,
    receiver      TEXT NOT NULL,
    phone         TEXT NOT NULL,
    address       TEXT NOT NULL,
    total         REAL NOT NULL DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'pending',  -- 待付款 pending / 待发货 paid / 待收货 shipped / 已完成 done / 已取消 cancelled
    tracking_no   TEXT DEFAULT '',
    remark        TEXT DEFAULT '',
    created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    paid_at       TEXT,
    shipped_at    TEXT,
    done_at       TEXT
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    price      REAL NOT NULL,
    qty        INTEGER NOT NULL,
    image      TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );
  CREATE INDEX IF NOT EXISTS idx_products_heritage ON products(heritage_id);
  CREATE INDEX IF NOT EXISTS idx_cart_user ON cart(user_id);
  CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
`);

// ---------------------------------------------------------------
// 非遗全景数据入库（首次自动全量播种 185 条，保证存在后与商品联动/冗余展示）
function ensureHeritageSeeded() {
  const n = db.prepare('SELECT COUNT(*) AS c FROM heritage').get().c;
  if (n > 0) return;
  if (!fs.existsSync(GEOJSON_PATH)) {
    console.warn('[shop-db] 未找到 heritage.geojson，非遗入库跳过');
    return;
  }
  const gj = JSON.parse(fs.readFileSync(GEOJSON_PATH, 'utf8'));
  const ins = db.prepare(
    `INSERT INTO heritage (id,name,category,city,district,area,protect_unit,year,code,type,province,photo,lng,lat)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  db.exec('BEGIN');
  try {
    for (const f of gj.features) {
      const p = f.properties || {};
      const g1 = (f.geometry || {}).coordinates || [];
      ins.run(
        p.id ?? null,
        p.name ?? '',
        p.category ?? null,
        p.city ?? null,
        p.district ?? null,
        p.area ?? null,
        p.protectUnit ?? null,
        p.year ?? null,
        p.code ?? null,
        p.type ?? null,
        p.province ?? null,
        p.photo ?? null,
        g1[0] ?? null,
        g1[1] ?? null,
      );
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  console.log(`[shop-db] 非遗全景数据入库完成：共 ${db.prepare('SELECT COUNT(*) AS c FROM heritage').get().c} 条`);
}

// ---------- 精选文创清单（heritage_id 稳定；首次按需 seed，删单可再插回）----------
const SEED_PRODUCTS = [
  { hid: 1,  name: '梁祝化蝶·剪纸书签', subtitle: '民间文学·梁祝传说', price: 39, stock: 120, desc: '取"化蝶"意象的金属镂空剪纸书签，随书附梁祝故事卡。' },
  { hid: 147,name: '潍坊沙燕风筝·迷你挂件', subtitle: '传统技艺·潍坊风筝', price: 89, stock: 80, desc: '传统沙燕扎制工艺缩小版，可挂饰可微放，线盘同赠。' },
  { hid: 148,name: '博山琉璃·葫芦挂件', subtitle: '传统技艺·琉璃烧制', price: 68, stock: 95, desc: '博山古法琉璃手工烧制，福禄葫芦，附礼盒。' },
  { hid: 152,name: '鲁锦手工织造围巾', subtitle: '传统技艺·鲁锦织造', price: 129, stock: 60, desc: '老织机土布织造，经典条纹，山东两千年织造技艺。' },
  { hid: 158,name: '周村烧饼·香酥礼盒', subtitle: '传统技艺·周村烧饼', price: 45, stock: 200, desc: '薄如纸、酥掉渣的非遗烧饼礼盒，地道淄博风味。' },
  { hid: 160,name: '鱼子蓝釉·主人杯', subtitle: '传统技艺·淄博陶瓷', price: 99, stock: 70, desc: '鱼子蓝釉柴烧茶器，淄博窑火传承之选。' },
  { hid: 161,name: '孔府家宴·钤印记事本', subtitle: '传统技艺·孔府菜', price: 39, stock: 110, desc: '手账封面钤"孔府"印章，内附四时家宴菜谱简页。' },
  { hid: 163,name: '德州扒鸡·真空礼袋', subtitle: '传统技艺·德州扒鸡', price: 55, stock: 150, desc: '五香脱骨、老汤入味，真空锁鲜送礼自享皆宜。' },
  { hid: 119,name: '杨家埠年画·门神摆件', subtitle: '传统美术·木版年画', price: 69, stock: 85, desc: '木版套印门神小摆件，辟邪纳福之年味。' },
  { hid: 124,name: '高密剪纸·生肖书签四枚', subtitle: '传统美术·高密剪纸', price: 25, stock: 160, desc: '民间剪纸传承人花样，镂空生肖入笺。' },
  { hid: 75, name: '泰山皮影·武松打虎套装', subtitle: '传统戏剧·泰山皮影', price: 159, stock: 40, desc: '泰山皮影"十不闲"经典剧目影偶，配简易撑杆与光源把玩。' },
  { hid: 79, name: '吕剧脸谱·杯垫两款', subtitle: '传统戏剧·吕剧', price: 35, stock: 100, desc: '吕剧经典生旦脸谱手绘杯垫，齐鲁乡音之美。' },
  { hid: 97, name: '山东快书·鸳鸯板', subtitle: '曲艺·山东快书', price: 78, stock: 55, desc: '高派鸳鸯板铜制，快书说唱入门把玩一件。' },
  { hid: 92, name: '胶东大鼓·钥匙扣', subtitle: '曲艺·胶东大鼓', price: 28, stock: 130, desc: '迷你鼓型挂件，致敬"山东大鼓三家"。' },
  { hid: 106,name: '蹴鞠纹·帆布托特包', subtitle: '传统体育游艺·蹴鞠', price: 69, stock: 90, desc: '齐都蹴鞠"十二片锦"纹样，临淄主题托特包。' },
  { hid: 175,name: '淄博花灯·木质小夜灯', subtitle: '民俗·淄博花灯会', price: 85, stock: 75, desc: '暖光木质底座，非遗花灯会灯艺装点居室。' },
];

function ensureProductsSeeded() {
  const n = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;
  if (n > 0) return;
  const getheritage = db.prepare('SELECT id,name,category,city,photo FROM heritage WHERE id = ?');
  const ins = db.prepare(
    `INSERT INTO products (heritage_id,category,name,subtitle,price,stock,image,description,on_sale)
     VALUES (?,?,?,?,?,?,?,?,1)`
  );
  db.exec('BEGIN');
  try {
    for (const s of SEED_PRODUCTS) {
      const h = getheritage.get(s.hid);
      if (!h) { console.warn(`[shop-db] seed 跳过：heritage#${s.hid} 不存在`); continue; }
      ins.run(
        h.id, h.category, s.name, s.subtitle + ' · ' + (h.city || ''),
        s.price, s.stock, h.photo, s.desc,
      );
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  console.log(`[shop-db] 精选文创商品已播种：共 ${SEED_PRODUCTS.length} 款（可后台增改）`);
}

ensureHeritageSeeded();
ensureProductsSeeded();

// ---------------------------------------------------------------
// 查询 API
export function listHeritage() {
  return db.prepare('SELECT id,name,category,city,district,photo FROM heritage ORDER BY id').all();
}

/** 商品列表；category 为空则全部；seller/all? onSale 过滤（仅上架） */
export function listProducts({ category = '', onSale = true } = {}) {
  let sql = `SELECT id,heritage_id AS heritageId,category,name,subtitle,price,stock,image,description,
                    on_sale AS onSale
             FROM products WHERE 1=1`;
  const args = [];
  if (onSale) { sql += ' AND on_sale = 1'; }
  if (category) { sql += ' AND category = ?'; args.push(category); }
  sql += ' ORDER BY id';
  return db.prepare(sql).all(...args);
}

export function productCategories() {
  return db
    .prepare('SELECT category, COUNT(*) AS c FROM products GROUP BY category ORDER BY c DESC')
    .all();
}

export function getProductById(id) {
  return db
    .prepare(`SELECT id,heritage_id AS heritageId,category,name,subtitle,price,stock,image,description,on_sale AS onSale FROM products WHERE id = ?`)
    .get(id);
}

/** admin：新增商品 */
export function addProduct({ heritageId, category, name, subtitle, price, stock, image, description, onSale = 1 }) {
  const info = db
    .prepare('INSERT INTO products (heritage_id,category,name,subtitle,price,stock,image,description,on_sale) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(heritageId ?? null, category ?? null, name, subtitle || '', Number(price) || 0, Number(stock) || 0, image || null, description || '', onSale ? 1 : 0);
  return getProductById(info.lastInsertRowid);
}

/** admin：更新商品 */
export function updateProduct(id, patch) {
  const cur = getProductById(id);
  if (!cur) throw new Error('商品不存在');
  const next = {
    heritageId: patch.heritageId ?? cur.heritageId,
    category: patch.category ?? cur.category,
    name: patch.name ?? cur.name,
    subtitle: patch.subtitle ?? cur.subtitle,
    price: Number(patch.price ?? cur.price),
    stock: Number(patch.stock ?? cur.stock),
    image: patch.image !== undefined ? patch.image : cur.image,
    description: patch.description ?? cur.description,
    onSale: patch.onSale !== undefined ? (patch.onSale ? 1 : 0) : cur.onSale,
  };
  db.prepare(
    'UPDATE products SET heritage_id=?,category=?,name=?,subtitle=?,price=?,stock=?,image=?,description=?,on_sale=? WHERE id=?'
  ).run(next.heritageId, next.category, next.name, next.subtitle, next.price, next.stock, next.image, next.description, next.onSale, id);
  return getProductById(id);
}

export function deleteProduct(id) {
  const info = db.prepare('DELETE FROM products WHERE id = ?').run(id);
  if (!info.changes) throw new Error('商品不存在');
  return { ok: true };
}

// ---------------------------------------------------------------
// 购物车
export function getCart(userId) {
  const rows = db
    .prepare(`SELECT c.product_id AS productId, c.qty, p.name, p.subtitle, p.price, p.image, p.stock, p.on_sale AS onSale
              FROM cart c JOIN products p ON p.id = c.product_id
              WHERE c.user_id = ? ORDER BY c.id`)
    .all(userId);
  return rows.filter(r => r.onSale); // 已下架商品不展示在购物车
}

export function setCartQty(userId, productId, qty) {
  const p = getProductById(Number(productId));
  if (!p) throw new Error('商品不存在');
  qty = Number(qty);
  if (qty <= 0) {
    db.prepare('DELETE FROM cart WHERE user_id = ? AND product_id = ?').run(userId, productId);
    return getCart(userId);
  }
  db.prepare(
    'INSERT INTO cart (user_id, product_id, qty) VALUES (?,?,?) ON CONFLICT(user_id, product_id) DO UPDATE SET qty = excluded.qty'
  ).run(userId, productId, qty);
  return getCart(userId);
}

export function clearCart(userId) {
  db.prepare('DELETE FROM cart WHERE user_id = ?').run(userId);
}

const orderStatusChinese = {
  pending: '待付款', paid: '待发货', shipped: '已发货', done: '已完成', cancelled: '已取消',
};
export { orderStatusChinese };

function genOrderNo() {
  // 时间戳 + 随机
  const t = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const stamp = `${p2(t.getHours())}${p2(t.getMinutes())}${p2(t.getSeconds())}`;
  return `WG${t.getFullYear()}${p2(t.getMonth() + 1)}${p2(t.getDate())}${stamp}${Math.floor(Math.random() * 900 + 100)}`;
}

/** 下单（用当前购物车）返回订单摘要；totalMoney 作为应付款。 */
export function createOrder(userId, { receiver, phone, address, remark = '' }) {
  if (!receiver || !phone || !address) throw new Error('请填写收货人、电话与地址');
  const cart = getCart(userId);
  if (!cart.length) throw new Error('购物车为空');
  // 校验库存
  for (const c of cart) {
    if (c.qty > c.stock) throw new Error(`"${c.name}" 库存不足（剩余 ${c.stock}）`);
  }
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const orderNo = genOrderNo();
  const info = db
    .prepare(`INSERT INTO orders (order_no,user_id,receiver,phone,address,total,remark) VALUES (?,?,?,?,?,?,?)`)
    .run(orderNo, userId, receiver, phone, address, Number(total.toFixed(2)), remark);
  const orderId = info.lastInsertRowid;
  const insItem = db.prepare(
    'INSERT INTO order_items (order_id,product_id,product_name,price,qty,image) VALUES (?,?,?,?,?,?)'
  );
  db.exec('BEGIN');
  try {
    for (const c of cart) {
      insItem.run(orderId, c.productId, c.name, c.price, c.qty, c.image);
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(c.qty, c.productId);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  // 清空购物车
  db.prepare('DELETE FROM cart WHERE user_id = ?').run(userId);
  return getOrderRaw(userId, orderNo);
}

export function getOrderRaw(userId, orderNo) {
  const row = db.prepare('SELECT * FROM orders WHERE order_no = ? AND user_id = ?').get(orderNo, userId);
  if (!row) return null;
  const items = db
    .prepare('SELECT product_id AS productId, product_name AS productName, price, qty, image FROM order_items WHERE order_id = ?')
    .all(row.id);
  return {
    orderNo: row.order_no, id: row.id, receiver: row.receiver, phone: row.phone,
    address: row.address, total: row.total, status: row.status,
    trackingNo: row.tracking_no || '', remark: row.remark || '',
    createdAt: row.created_at, items,
  };
}

export function getOrdersByUser(userId) {
  const rows = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(userId);
  return rows.map((row) => {
    const items = db
      .prepare('SELECT product_name AS productName, price, qty, image FROM order_items WHERE order_id = ?')
      .all(row.id);
    return {
      orderNo: row.order_no, id: row.id, receiver: row.receiver, phone: row.phone,
      address: row.address, total: row.total, status: row.status,
      trackingNo: row.tracking_no || '', remark: row.remark || '', createdAt: row.created_at,
      paidAt: row.paid_at || null, shippedAt: row.shipped_at || null, doneAt: row.done_at || null,
      items,
    };
  });
}

/** admin：全部订单视图（含 userId，用户名由外部用 user-db 列表补上） */
export function getAllOrdersRaw() {
  return db
    .prepare(`SELECT * FROM orders ORDER BY id DESC`)
    .all()
    .map((row) => {
      const items = db
        .prepare('SELECT product_name AS productName, price, qty, image FROM order_items WHERE order_id = ?')
        .all(row.id);
      return {
        orderNo: row.order_no, id: row.id, userId: row.user_id, receiver: row.receiver,
        phone: row.phone, address: row.address, total: row.total, status: row.status,
        trackingNo: row.tracking_no || '', remark: row.remark || '', createdAt: row.created_at,
        paidAt: row.paid_at || null, shippedAt: row.shipped_at || null, doneAt: row.done_at || null,
        items,
      };
    });
}

/** 付款（模拟支付：pending -> paid） 扣減訂單真實入库已在下单扣减；这里主要是履约状态 */
export function payOrder(userId, orderNo) {
  const row = db.prepare('SELECT * FROM orders WHERE order_no = ? AND user_id = ?').get(orderNo, userId);
  if (!row) throw new Error('订单不存在');
  if (row.status !== 'pending') throw new Error('当前订单状态不可付款');
  db.prepare("UPDATE orders SET status='paid', paid_at=datetime('now','localtime') WHERE id = ?").run(row.id);
  return getOrderRaw(userId, orderNo);
}

/** 用户取消订单（仅 pending/paid 可取消；取消需回补库存） */
export function cancelOrder(userId, orderNo) {
  const row = db.prepare('SELECT * FROM orders WHERE order_no = ? AND user_id = ?').get(orderNo, userId);
  if (!row) throw new Error('订单不存在');
  if (!['pending', 'paid'].includes(row.status)) throw new Error('该状态不可取消');
  db.prepare("UPDATE orders SET status='cancelled' WHERE id = ?").run(row.id);
  // 回补库存
  for (const it of db.prepare('SELECT product_id AS productId, qty FROM order_items WHERE order_id = ?').all(row.id)) {
    if (it.productId) db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(it.qty, it.productId);
  }
  return getOrderRaw(userId, orderNo);
}

/** 用户确认收货：shipped -> done */
export function confirmOrder(userId, orderNo) {
  const row = db.prepare('SELECT * FROM orders WHERE order_no = ? AND user_id = ?').get(orderNo, userId);
  if (!row) throw new Error('订单不存在');
  if (row.status !== 'shipped') throw new Error('只有已发货订单可确认收货');
  db.prepare("UPDATE orders SET status='done', done_at=datetime('now','localtime') WHERE id = ?").run(row.id);
  return getOrderRaw(userId, orderNo);
}

// ---- admin 管理订单 ----
/** admin：发货（paid -> shipped，需填 tracking_no 物流单号） */
export function shipOrder(orderNo, trackingNo) {
  const row = db.prepare('SELECT * FROM orders WHERE order_no = ?').get(orderNo);
  if (!row) throw new Error('订单不存在');
  if (row.status !== 'paid') throw new Error('仅待发货订单可发货');
  const track = String(trackingNo || '').trim();
  if (!track) throw new Error('请填写物流单号');
  db.prepare("UPDATE orders SET status='shipped', tracking_no=?, shipped_at=datetime('now','localtime') WHERE id = ?")
    .run(track, row.id);
  return { ok: true };
}

export function orderStat() {
  const rows = db.prepare("SELECT status, COUNT(*) AS c FROM orders GROUP BY status").all();
  const stat = { total: 0, pending: 0, paid: 0, shipped: 0, done: 0, cancelled: 0 };
  for (const r of rows) { stat[r.status] = r.c; stat.total += r.c; }
  return stat;
}
