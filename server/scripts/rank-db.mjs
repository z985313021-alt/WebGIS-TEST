/**
 * 热度榜聚合查询模块
 *
 * 跨库取数：以 shop.db 为主库（heritage / products / orders），
 * ATTACH interact.db 读取 comments 与 likes。
 *
 * 口径约定：
 * - 非遗「关联订单」按明细所属订单去重计数（COUNT DISTINCT order_id），避免一单多件重复计；
 * - 商品销量只统计**有效订单**（status != 'cancelled'），与商城业务口径一致；
 * - 综合热度 heat = 点赞×1 + 评论×3 + 关联订单×5（互动越"重"权重越高）。
 */
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const SHOP_DB = join(DATA_DIR, 'shop.db');
const INTERACT_DB = join(DATA_DIR, 'interact.db').replace(/\\/g, '/');

const db = new DatabaseSync(SHOP_DB);
try {
  db.exec(`ATTACH DATABASE '${INTERACT_DB}' AS interact`);
} catch {
  // 已 ATTACH 过则忽略
}

export const HERITAGE_METRICS = {
  heat: 'heat', likes: 'likes', comments: 'comments', orders: 'orders',
};
export const PRODUCT_METRICS = {
  sales: 'sales', orders: 'orders', revenue: 'revenue',
};

const LIMIT_MAX = 100;

/** 非遗热度榜 */
export function heritageRank({ metric = 'heat', limit = 20 } = {}) {
  const by = HERITAGE_METRICS[metric] ?? 'heat';
  const n = Math.min(Math.max(Number(limit) || 20, 1), LIMIT_MAX);
  return db.prepare(`
    SELECT h.id, h.name, h.category, h.city, h.district, h.photo,
           COALESCE(l.count, 0) AS likes,
           COALESCE(c.cnt, 0)   AS comments,
           COALESCE(o.cnt, 0)   AS orders,
           COALESCE(l.count, 0) * 1 + COALESCE(c.cnt, 0) * 3 + COALESCE(o.cnt, 0) * 5 AS heat
      FROM heritage h
      LEFT JOIN interact.likes l ON l.item_id = h.id
      LEFT JOIN (SELECT item_id, COUNT(*) AS cnt FROM interact.comments GROUP BY item_id) c
             ON c.item_id = h.id
      LEFT JOIN (
             SELECT p.heritage_id AS hid, COUNT(DISTINCT oi.order_id) AS cnt
               FROM order_items oi
               JOIN products p ON p.id = oi.product_id
               JOIN orders o ON o.id = oi.order_id
              WHERE o.status != 'cancelled'
              GROUP BY p.heritage_id
           ) o ON o.hid = h.id
     ORDER BY ${by} DESC, h.id ASC
     LIMIT ?`).all(n);
}

/** 商品热销榜 */
export function productRank({ metric = 'sales', limit = 20 } = {}) {
  const by = PRODUCT_METRICS[metric] ?? 'sales';
  const n = Math.min(Math.max(Number(limit) || 20, 1), LIMIT_MAX);
  return db.prepare(`
    SELECT p.id, p.name, p.subtitle, p.price, p.image, p.stock, p.on_sale AS onSale,
           p.heritage_id AS heritageId,
           COALESCE(SUM(oi.qty), 0)                       AS sales,
           COUNT(DISTINCT oi.order_id)                    AS orders,
           ROUND(COALESCE(SUM(oi.qty * oi.price), 0), 2)  AS revenue
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled'
     GROUP BY p.id
     ORDER BY ${by} DESC, p.id ASC
     LIMIT ?`).all(n);
}

/** 榜单总览：全站互动与交易规模 */
export function rankOverview() {
  const likes = db.prepare('SELECT COALESCE(SUM(count), 0) AS n FROM interact.likes').get().n;
  const comments = db.prepare('SELECT COUNT(*) AS n FROM interact.comments').get().n;
  const orders = db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status != 'cancelled'").get().n;
  const revenue = db.prepare("SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE status != 'cancelled'").get().n;
  const rankedHeritage = db.prepare('SELECT COUNT(DISTINCT item_id) AS n FROM interact.likes').get().n;
  return {
    likes: Number(likes),
    comments: Number(comments),
    orders: Number(orders),
    revenue: Number(Number(revenue).toFixed(2)),
    rankedHeritage: Number(rankedHeritage),
    heritageTotal: Number(db.prepare('SELECT COUNT(*) AS n FROM heritage').get().n),
    productTotal: Number(db.prepare('SELECT COUNT(*) AS n FROM products').get().n),
  };
}
