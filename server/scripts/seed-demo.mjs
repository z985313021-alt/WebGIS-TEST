/**
 * 演示 / 压测数据生成器
 *
 * 用法：
 *   node server/scripts/seed-demo.mjs                      # 默认规模
 *   node server/scripts/seed-demo.mjs --users=500 --comments=8000 --likes=20000 --orders=1500
 *   node server/scripts/seed-demo.mjs --reset              # 先清空本脚本产生的数据再生成
 *
 * 说明：
 * - 只写 users.db / interact.db / shop.db 三张库，不动 heritage 与 products 的基础数据；
 * - 热度按偏斜分布分配（少数条目拿走大部分热度），否则榜单没有区分度；
 * - 不生成 pending 订单：服务端超时扫描会把过期未支付订单取消并**回补库存**，
 *   造历史 pending 会污染商品库存；
 * - 所有 demo 用户密码统一为 --password 指定的值（默认 Demo123456），可直接登录演示。
 */
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

const usersDb = new DatabaseSync(join(DATA_DIR, 'users.db'));
const interactDb = new DatabaseSync(join(DATA_DIR, 'interact.db'));
const shopDb = new DatabaseSync(join(DATA_DIR, 'shop.db'));

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    return m ? [m[1], m[2] ?? 'true'] : [a, 'true'];
  }),
);
const N_USERS = Number(args.users ?? 300);
const N_COMMENTS = Number(args.comments ?? 4000);
const N_LIKES = Number(args.likes ?? 8000);
const N_ORDERS = Number(args.orders ?? 800);
const RESET = args.reset === 'true';
const PASSWORD = String(args.password ?? 'Demo123456');
const DEMO_PREFIX = 'demo_';

/** 偏斜随机索引：pow 越大越极端，用来制造「头部爆款 + 长尾冷门」 */
function skewed(n, power = 2.6) {
  return Math.min(n - 1, Math.floor(Math.pow(Math.random(), power) * n));
}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

/** Date → 'YYYY-MM-DD HH:mm:ss'（本地时区，与 SQLite datetime('now','localtime') 格式一致） */
function localDateTime(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 与 user-db.mjs 一致的 scrypt 加盐哈希格式 "salt:hash" */
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

const NICK_BASE = [
  '齐鲁游子', '胶东老饕', '泰山脚下', '黄河岸边', '泉城小王', '鲁南阿文', '半岛渔客',
  '潍水人家', '运河船工', '沂蒙小调', '菏泽牡丹客', '青岛海风', '淄博陶友', '聊城书生',
  '德州扒鸡粉', '滨州枣乡人', '日照茶客', '莱芜香山', '东营湿地', '枣庄石榴',
];
const COMMENT_TEMPLATES = [
  '第一次这么近距离了解{name}，比想象中震撼',
  '{category}里的代表作，值得专门跑一趟',
  '小时候在老家见过类似的手艺，太亲切了',
  '看完想去{city}实地走一趟，有人一起吗',
  '这项技艺的传承人真的不容易，希望能一直传下去',
  '拍得很细，细节都能看清，收藏了',
  '跟长辈聊过，{name}在他们那辈人里几乎人人都知道',
  '把非遗做成数字地图这个思路挺好，找起来方便多了',
  '有没有体验课？想带孩子去感受一下',
  '从{year}年公布到现在，保护得还不错',
  '{city}的非遗真不少，这一项尤其有意思',
  '希望能多出一些这样的记录，别让手艺断了',
  '画面质感很好，看得出是认真做过的项目',
  '我们学校社团就做过{name}的调研，看这篇补全了不少细节',
  '作为{city}人很自豪，欢迎大家都来看看',
  '讲得通俗易懂，非专业也能看懂',
];

// ---------- 读取基础数据 ----------
const heritages = shopDb.prepare('SELECT id, name, category, city, year FROM heritage ORDER BY id').all();
const products = shopDb.prepare('SELECT id, name, price, on_sale FROM products ORDER BY id').all();
if (heritages.length === 0) {
  console.error('[seed] heritage 表为空，请先启动一次服务端以灌入基础非遗数据');
  process.exit(1);
}
if (products.length === 0) {
  console.error('[seed] products 表为空，无法生成订单');
  process.exit(1);
}

// ---------- 可选重置 ----------
if (RESET) {
  interactDb.exec('DELETE FROM comments; DELETE FROM likes;');
  shopDb.exec('DELETE FROM order_items; DELETE FROM orders;');
  usersDb.prepare("DELETE FROM users WHERE username LIKE ? OR email LIKE ?").run(`${DEMO_PREFIX}%`, `${DEMO_PREFIX}%`);
  console.log('[seed] 已清空上一批演示数据');
}

const t0 = Date.now();
const pwdHash = hashPassword(PASSWORD);

// ---------- 1. 用户 ----------
let createdUsers = 0;
usersDb.exec('BEGIN');
try {
  const ins = usersDb.prepare('INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)');
  const startIdx = Number(usersDb.prepare("SELECT COALESCE(MAX(id), 0) AS m FROM users").get().m);
  for (let i = 0; i < N_USERS; i++) {
    const name = `${DEMO_PREFIX}${String(startIdx + i + 1).padStart(4, '0')}`;
    const info = ins.run(name, `${name}@demo.local`, pwdHash, 'user');
    if (Number(info.changes) > 0) createdUsers += 1;
  }
  usersDb.exec('COMMIT');
} catch (e) {
  usersDb.exec('ROLLBACK');
  throw e;
}
const demoUserIds = usersDb
  .prepare("SELECT id FROM users WHERE username LIKE ? ORDER BY id")
  .all(`${DEMO_PREFIX}%`)
  .map((r) => r.id);

// ---------- 2. 评论（偏斜分配，头部若干项吃掉大部分评论） ----------
interactDb.exec('BEGIN');
let createdComments = 0;
try {
  const ins = interactDb.prepare(
    "INSERT INTO comments (item_id, nickname, content, created_at) VALUES (?, ?, ?, datetime('now','localtime','-' || ? || ' days','-' || ? || ' hours'))",
  );
  for (let i = 0; i < N_COMMENTS; i++) {
    const h = heritages[skewed(heritages.length)];
    const nick = `${pick(NICK_BASE)}${randInt(10, 9999)}`;
    const content = pick(COMMENT_TEMPLATES)
      .replaceAll('{name}', h.name)
      .replaceAll('{category}', h.category ?? '传统技艺')
      .replaceAll('{city}', (h.city ?? '山东').replace(/市$/, ''));
    ins.run(h.id, nick, content, randInt(0, 180), randInt(0, 23));
    createdComments += 1;
  }
  interactDb.exec('COMMIT');
} catch (e) {
  interactDb.exec('ROLLBACK');
  throw e;
}

// ---------- 3. 点赞（likes 只有计数列，按偏斜分布累加） ----------
interactDb.exec('BEGIN');
try {
  const upsert = interactDb.prepare(
    'INSERT INTO likes (item_id, count) VALUES (?, ?) ON CONFLICT(item_id) DO UPDATE SET count = count + excluded.count',
  );
  const buckets = new Map();
  for (let i = 0; i < N_LIKES; i++) {
    const h = heritages[skewed(heritages.length)];
    buckets.set(h.id, (buckets.get(h.id) ?? 0) + 1);
  }
  for (const [itemId, cnt] of buckets) upsert.run(itemId, cnt);
  interactDb.exec('COMMIT');
} catch (e) {
  interactDb.exec('ROLLBACK');
  throw e;
}

// ---------- 4. 订单 + 明细（状态只用终态，避免被超时扫描回补库存） ----------
const STATUS_POOL = [
  ...Array(50).fill('done'),
  ...Array(15).fill('shipped'),
  ...Array(15).fill('paid'),
  ...Array(12).fill('cancelled'),
];
const RECEIVERS = ['张伟', '李娜', '王芳', '刘洋', '陈静', '杨帆', '赵磊', '孙倩', '周涛', '吴敏'];
const CITIES = ['济南市历下区', '青岛市市南区', '淄博市张店区', '泰安市泰山区', '潍坊市奎文区', '济宁市任城区', '烟台市芝罘区', '临沂市兰山区'];

shopDb.exec('BEGIN');
let createdOrders = 0;
try {
  const insOrder = shopDb.prepare(`INSERT INTO orders
    (order_no, user_id, receiver, phone, address, total, status, tracking_no, created_at, paid_at, shipped_at, done_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime','-' || ? || ' days','-' || ? || ' hours'), ?, ?, ?)`);
  const insItem = shopDb.prepare(
    'INSERT INTO order_items (order_id, product_id, product_name, price, qty) VALUES (?, ?, ?, ?, ?)',
  );
  for (let i = 0; i < N_ORDERS; i++) {
    const userId = pick(demoUserIds);
    const status = pick(STATUS_POOL);
    const daysAgo = randInt(0, 150);
    const hoursAgo = randInt(0, 23);
    const items = [];
    const used = new Set();
    const itemCount = randInt(1, 3);
    for (let k = 0; k < itemCount; k++) {
      const p = products[skewed(products.length, 1.8)];
      if (used.has(p.id)) continue;
      used.add(p.id);
      items.push({ p, qty: randInt(1, 2) });
    }
    if (items.length === 0) continue;
    const total = items.reduce((s, it) => s + it.p.price * it.qty, 0);
    const orderNo = `DEMO${String(Date.now()).slice(-6)}${String(i).padStart(5, '0')}`;
    // 时间一律在 JS 里算成 'YYYY-MM-DD HH:mm:ss'：SQL 表达式不能当参数传，
    // 否则会被当成字面字符串写进库里
    const at = (d, h) => localDateTime(new Date(Date.now() - d * 86400000 - h * 3600000));
    const paidAt = status === 'cancelled' ? null : at(daysAgo, hoursAgo);
    const shippedAt = status === 'shipped' || status === 'done' ? at(Math.max(0, daysAgo - 1), hoursAgo) : null;
    const doneAt = status === 'done' ? at(Math.max(0, daysAgo - 3), hoursAgo) : null;
    const info = insOrder.run(
      orderNo, userId, pick(RECEIVERS), '138' + String(randInt(10000000, 99999999)),
      `山东省${pick(CITIES)}${randInt(1, 200)}号`, Number(total.toFixed(2)), status,
      status === 'done' || status === 'shipped' ? `SF${randInt(100000000, 999999999)}` : '',
      daysAgo, hoursAgo,
      paidAt, shippedAt, doneAt,
    );
    const orderId = Number(info.lastInsertRowid);
    for (const it of items) insItem.run(orderId, it.p.id, it.p.name, it.p.price, it.qty);
    createdOrders += 1;
  }
  shopDb.exec('COMMIT');
} catch (e) {
  shopDb.exec('ROLLBACK');
  throw e;
}

// ---------- 汇总 ----------
const stat = (db, sql) => Number(db.prepare(sql).get().n);
console.log(`[seed] 完成，用时 ${((Date.now() - t0) / 1000).toFixed(2)}s`);
console.log(`  用户    + ${createdUsers}（demo_ 前缀，密码 ${PASSWORD}）`);
console.log(`  评论    + ${createdComments}  累计 ${stat(interactDb, 'SELECT COUNT(*) AS n FROM comments')}`);
console.log(`  点赞条数  累计 ${stat(interactDb, 'SELECT COALESCE(SUM(count),0) AS n FROM likes')}（覆盖 ${stat(interactDb, 'SELECT COUNT(*) AS n FROM likes')} 个非遗）`);
console.log(`  订单    + ${createdOrders}  累计 ${stat(shopDb, 'SELECT COUNT(*) AS n FROM orders')}，明细 ${stat(shopDb, "SELECT COUNT(*) AS n FROM order_items")}`);
const hot = shopDb.prepare(`SELECT h.name, COUNT(*) AS c FROM order_items oi JOIN products p ON p.id = oi.product_id
  JOIN heritage h ON h.id = p.heritage_id GROUP BY h.id ORDER BY c DESC LIMIT 3`).all();
console.log('  订单最集中的非遗：' + hot.map((r) => `${r.name}(${r.c})`).join('、'));
