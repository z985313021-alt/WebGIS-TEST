import { gcj02ToWgs84 } from '@/services/geo/coord';

/**
 * 逻辑层：订单物流路线模拟（教学演示，不对接真实快递接口）
 * - 从收货地址解析目的城市
 * - 规划 发货仓 → [物流枢纽] → 收货城市 的路线
 * - 按发货时间推算当前位置与预计到达时间
 */

/** 发货仓（非遗文创统一从山东发出） */
export interface Warehouse { id: string; name: string; city: string; lng: number; lat: number }
export const WAREHOUSES: Warehouse[] = [
  { id: 'jinan', name: '济南文创总仓', city: '济南', lng: 117.120128, lat: 36.652069 },
  { id: 'qingdao', name: '青岛分仓', city: '青岛', lng: 120.382639, lat: 36.067082 },
];

/** 全国主要城市坐标（物流线路计算用） */
export const CITY_COORDS: Record<string, [number, number]> = {
  '济南': [117.120128, 36.652069], '青岛': [120.382639, 36.067082], '淄博': [118.047648, 36.814939],
  '枣庄': [117.323725, 34.810487], '东营': [118.664710, 37.434564], '烟台': [121.447935, 37.463822],
  '潍坊': [119.107078, 36.709250], '济宁': [116.587245, 35.414393], '泰安': [117.129063, 36.194968],
  '威海': [122.120419, 37.513068], '日照': [119.461208, 35.428588], '临沂': [118.326443, 35.065282],
  '德州': [116.307428, 37.453968], '聊城': [115.980367, 36.456013], '滨州': [117.970703, 37.382112],
  '菏泽': [115.469381, 35.246531],
  '北京': [116.407394, 39.904211], '上海': [121.473701, 31.230416], '天津': [117.190182, 39.125596],
  '重庆': [106.551557, 29.563009], '广州': [113.264385, 23.129112], '深圳': [114.057868, 22.543099],
  '成都': [104.066541, 30.572269], '武汉': [114.305393, 30.593099], '西安': [108.939465, 34.341574],
  '南京': [118.796877, 32.060255], '杭州': [120.15507, 30.274084], '郑州': [113.625368, 34.746599],
  '石家庄': [114.514859, 38.042306], '太原': [112.548879, 37.87059], '沈阳': [123.431474, 41.805698],
  '大连': [121.614682, 38.914003], '长春': [125.323544, 43.817071], '哈尔滨': [126.534967, 45.803775],
  '长沙': [112.938814, 28.228209], '南昌': [115.858197, 28.682892], '合肥': [117.227239, 31.820586],
  '福州': [119.296494, 26.074508], '厦门': [118.089425, 24.479833], '昆明': [102.832891, 24.880095],
  '贵阳': [106.630153, 26.647661], '南宁': [108.366543, 22.817002], '兰州': [103.834303, 36.061089],
  '西宁': [101.778228, 36.617144], '银川': [106.230909, 38.487193], '呼和浩特': [111.749180, 40.842585],
  '乌鲁木齐': [87.616848, 43.825592], '拉萨': [91.140856, 29.645554], '海口': [110.198293, 20.044001],
  '三亚': [109.511909, 18.252847], '苏州': [120.585315, 31.298886], '无锡': [120.31191, 31.491169],
  '徐州': [117.284124, 34.205768], '常州': [119.973987, 31.810689], '南通': [120.894291, 31.980172],
  '温州': [120.699366, 27.994267], '宁波': [121.550357, 29.874556], '佛山': [113.122717, 23.028762],
  '东莞': [113.751765, 23.020536], '珠海': [113.576726, 22.270715], '洛阳': [112.45404, 34.619682],
  '开封': [114.307465, 34.797184], '新乡': [113.9268, 35.303004], '保定': [115.464589, 38.874434],
  '唐山': [118.180194, 39.630867], '秦皇岛': [119.600492, 39.935381], '廊坊': [116.703764, 39.518611],
  '沧州': [116.838834, 38.304477], '张家口': [114.887523, 40.824113], '咸阳': [108.705196, 34.333505],
  '宝鸡': [107.144731, 34.369429], '绵阳': [104.679604, 31.46751], '宜昌': [111.286471, 30.691967],
  '襄阳': [112.122426, 32.009016], '九江': [115.992811, 29.712034], '赣州': [114.940278, 25.85097],
  '芜湖': [118.376451, 31.326319], '蚌埠': [117.363702, 32.939667], '株洲': [113.151737, 27.835806],
  '湘潭': [112.944026, 27.829795], '衡阳': [112.572019, 26.893265], '桂林': [110.299121, 25.274215],
  '柳州': [109.415953, 24.325502], '遵义': [106.927389, 27.725654], '大理': [100.267638, 25.606486],
  '丽江': [100.227103, 26.855047], '延安': [109.489727, 36.585455], '天水': [105.724947, 34.580864],
  '包头': [109.840347, 40.657449], '鄂尔多斯': [109.781327, 39.608266],
};

/** 物流枢纽（跨省干线中转用） */
const HUBS: { city: string; lng: number; lat: number }[] = [
  { city: '郑州', lng: 113.625368, lat: 34.746599 },
  { city: '武汉', lng: 114.305393, lat: 30.593099 },
  { city: '西安', lng: 108.939465, lat: 34.341574 },
  { city: '北京', lng: 116.407394, lat: 39.904211 },
  { city: '上海', lng: 121.473701, lat: 31.230416 },
  { city: '广州', lng: 113.264385, lat: 23.129112 },
  { city: '成都', lng: 104.066541, lat: 30.572269 },
  { city: '沈阳', lng: 123.431474, lat: 41.805698 },
];

/** 两点球面距离（公里） */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = (b[1] - a[1]) * Math.PI / 180;
  const dLon = (b[0] - a[0]) * Math.PI / 180;
  const lat1 = a[1] * Math.PI / 180;
  const lat2 = b[1] * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 从收货地址解析城市名（未识别返回 null） */
export function parseCityFromAddress(address: string): string | null {
  if (!address) return null;
  const known = Object.keys(CITY_COORDS).sort((a, b) => b.length - a.length);
  for (const city of known) {
    if (address.includes(city)) return city;
  }
  const m = address.match(/([一-龥]{2,8}?)市/);
  return m ? m[1] : null;
}

/** 城市坐标（未收录时按名称哈希取近似点，保证路线可画） */
export function coordOf(city: string | null, fallback: [number, number] = [117.12, 36.65]): [number, number] {
  if (!city) return fallback;
  if (CITY_COORDS[city]) return CITY_COORDS[city];
  const bare = city.replace(/[市区县]$/, '');
  if (CITY_COORDS[bare]) return CITY_COORDS[bare];
  let h = 0;
  for (let i = 0; i < bare.length; i++) h = (h * 31 + bare.charCodeAt(i)) % 1000;
  return [fallback[0] + ((h % 40) - 20) * 0.35, fallback[1] + ((Math.floor(h / 40) % 30) - 15) * 0.3];
}

export interface RouteStop {
  city: string;
  name: string;
  lng: number;
  lat: number;
  km: number;
  t: number;
}

export interface LogisticsRoute {
  stops: RouteStop[];
  totalKm: number;
  etaDays: number;
}

/** 点到线段最短距离（挑选顺路枢纽） */
function pointToSegmentKm(p: [number, number], a: [number, number], b: [number, number]): number {
  const toXY = (c: [number, number]) => [c[0] * Math.cos(c[1] * Math.PI / 180) * 111.32, c[1] * 110.57];
  const [px, py] = toXY(p); const [ax, ay] = toXY(a); const [bx, by] = toXY(b);
  const dx = bx - ax; const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** 规划路线：发货仓 →（跨省顺路时经 1 个枢纽）→ 收货城市 */
export function planRoute(from: { city: string; name: string; lng: number; lat: number }, toCity: string): LogisticsRoute {
  const to = coordOf(toCity);
  const straight = distanceKm([from.lng, from.lat], to);
  const stops: RouteStop[] = [
    { city: from.city, name: from.name, lng: from.lng, lat: from.lat, km: 0, t: 0 },
  ];
  if (straight > 600) {
    let best: { city: string; lng: number; lat: number } | null = null;
    let bestDev = Infinity;
    for (const hub of HUBS) {
      if (hub.city === from.city || hub.city === toCity) continue;
      const detour = distanceKm([from.lng, from.lat], [hub.lng, hub.lat]) + distanceKm([hub.lng, hub.lat], to);
      if (detour > straight * 1.35) continue;
      const dev = pointToSegmentKm([hub.lng, hub.lat], [from.lng, from.lat], to);
      if (dev < bestDev) { bestDev = dev; best = hub; }
    }
    if (best) stops.push({ city: best.city, name: best.city + '转运中心', lng: best.lng, lat: best.lat, km: 0, t: 0 });
  }
  stops.push({ city: toCity || '收货地', name: (toCity || '收货地') + '配送站', lng: to[0], lat: to[1], km: 0, t: 0 });
  let acc = 0;
  for (let i = 0; i < stops.length; i++) {
    if (i > 0) acc += distanceKm([stops[i - 1].lng, stops[i - 1].lat], [stops[i].lng, stops[i].lat]);
    stops[i].km = acc;
  }
  const totalKm = acc;
  const PICK = 0.08; const DELIVER = 0.10;
  for (let i = 1; i < stops.length; i++) {
    stops[i].t = PICK + (stops[i].km / (totalKm || 1)) * (1 - PICK - DELIVER);
  }
  const etaDays = Math.max(1, Math.ceil((totalKm / 700 + 1) * 2) / 2);
  return { stops, totalKm, etaDays };
}

export type ShipStage = 'collected' | 'in_transit' | 'delivering' | 'signed';
export interface ShipmentState {
  stage: ShipStage;
  stageCn: string;
  lng: number;
  lat: number;
  progress: number;
  passedKm: number;
  etaAt: Date;
  remainDays: number;
  currentDesc: string;
  timeline: { time: Date; text: string; done: boolean }[];
}

/** 沿路线按总进度 t 求坐标与描述 */
function posAt(route: LogisticsRoute, t: number): { lng: number; lat: number; desc: string; km: number } {
  const stops = route.stops;
  const clamped = Math.max(0, Math.min(1, t));
  const PICK = stops[1] ? stops[1].t : 0.08;
  if (clamped <= PICK) return { lng: stops[0].lng, lat: stops[0].lat, desc: stops[0].name + ' 已揽收', km: 0 };
  for (let i = 1; i < stops.length; i++) {
    const prev = stops[i - 1]; const cur = stops[i];
    if (clamped <= cur.t) {
      const span = cur.t - prev.t || 1;
      const r = (clamped - prev.t) / span;
      return {
        lng: prev.lng + (cur.lng - prev.lng) * r,
        lat: prev.lat + (cur.lat - prev.lat) * r,
        desc: prev.name + ' → ' + cur.name,
        km: prev.km + (cur.km - prev.km) * r,
      };
    }
  }
  const last = stops[stops.length - 1];
  return { lng: last.lng, lat: last.lat, desc: '已到达 ' + last.name, km: last.km };
}

/** 根据订单时间与状态模拟物流进度 */
export function simulateShipment(route: LogisticsRoute, startAt: Date, signed: boolean): ShipmentState {
  const totalMs = route.etaDays * 24 * 3600 * 1000;
  const now = Date.now();
  const progress = signed ? 1 : Math.max(0, Math.min(1, (now - startAt.getTime()) / (totalMs || 1)));
  const etaAt = new Date(startAt.getTime() + totalMs);
  const cur = posAt(route, progress);
  let stage: ShipStage; let stageCn: string;
  if (signed || progress >= 0.97) { stage = 'signed'; stageCn = '已签收'; }
  else if (progress >= 0.90) { stage = 'delivering'; stageCn = '派送中'; }
  else if (progress <= 0.08) { stage = 'collected'; stageCn = '已揽收'; }
  else { stage = 'in_transit'; stageCn = '运输中'; }
  const remainMs = Math.max(0, etaAt.getTime() - now);
  const remainDays = signed ? 0 : Math.round((remainMs / 86400000) * 10) / 10;
  const at = (ratio: number) => new Date(startAt.getTime() + totalMs * ratio);
  const timeline: { time: Date; text: string; done: boolean }[] = [];
  timeline.push({ time: startAt, text: route.stops[0].name + ' 已揽收', done: true });
  for (let i = 1; i < route.stops.length; i++) {
    const s = route.stops[i];
    const isLast = i === route.stops.length - 1;
    timeline.push({
      time: at(s.t),
      text: isLast ? '到达 ' + s.name + '，准备派送' : '到达 ' + s.name + '（干线中转）',
      done: progress >= s.t,
    });
  }
  timeline.push({ time: at(0.92), text: '快递员派送中，请保持电话畅通', done: progress >= 0.92 });
  timeline.push({ time: at(1), text: '已签收，感谢使用非遗文创商城', done: progress >= 0.97 || signed });
  return {
    stage, stageCn, lng: cur.lng, lat: cur.lat, progress,
    passedKm: Math.round(cur.km), etaAt, remainDays, currentDesc: cur.desc, timeline,
  };
}
/** ===== 高德驾车路径（真实道路路线） ===== */

// 坐标转换统一使用 @/services/geo/coord 的 gcj02ToWgs84（高德 GCJ-02 → 底图 WGS84）

export interface DrivingPath {
  /** WGS84 路径点 */
  points: [number, number][];
  /** 实际道路里程（公里） */
  distanceKm: number;
  /** 预计行驶时长（小时） */
  hours: number;
}

/** 调后端高德代理取两段驾车路径（结果缓存，失败返回 null 由调用方回退直线） */
const drivingCache = new Map<string, DrivingPath | null>();
export async function fetchDrivingPath(
  origin: [number, number],
  destination: [number, number],
): Promise<DrivingPath | null> {
  const key = origin.join(',') + '>' + destination.join(',');
  if (drivingCache.has(key)) return drivingCache.get(key) ?? null;
  try {
    const url = '/api/amap/direction/driving?origin=' + origin.join(',') + '&destination=' + destination.join(',') + '&extensions=base';
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== '1' || !data.route?.paths?.length) { drivingCache.set(key, null); return null; }
    const path = data.route.paths[0];
    const points: [number, number][] = [];
    for (const step of path.steps || []) {
      for (const pair of String(step.polyline || '').split(';')) {
        const [lngStr, latStr] = pair.split(',');
        const lng = Number(lngStr); const lat = Number(latStr);
        if (Number.isFinite(lng) && Number.isFinite(lat)) points.push(gcj02ToWgs84(lng, lat));
      }
    }
    if (points.length < 2) { drivingCache.set(key, null); return null; }
    const result: DrivingPath = {
      points,
      distanceKm: Number(path.distance || 0) / 1000,
      hours: Number(path.duration || 0) / 3600,
    };
    drivingCache.set(key, result);
    return result;
  } catch {
    drivingCache.set(key, null);
    return null;
  }
}

/** 取整条物流路线的真实驾车路径（分段请求后拼接），失败返回 null */
export async function fetchRouteDrivingPath(route: LogisticsRoute): Promise<DrivingPath | null> {
  const stops = route.stops;
  if (stops.length < 2) return null;
  const all: [number, number][] = [];
  let totalKm = 0; let totalHours = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const seg = await fetchDrivingPath([stops[i].lng, stops[i].lat], [stops[i + 1].lng, stops[i + 1].lat]);
    if (!seg) return null;
    if (i > 0) seg.points.shift();
    all.push(...seg.points);
    totalKm += seg.distanceKm;
    totalHours += seg.hours;
  }
  return all.length >= 2 ? { points: all, distanceKm: totalKm, hours: totalHours } : null;
}
/** 在路径上按累计里程取点（用于把模拟进度映射到真实道路路径上） */
export function pointAtKm(points: [number, number][], km: number): [number, number] {
  if (!points.length) return [0, 0];
  if (km <= 0) return points[0];
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const d = distanceKm(points[i - 1], points[i]);
    if (acc + d >= km) {
      const r = d === 0 ? 0 : (km - acc) / d;
      return [
        points[i - 1][0] + (points[i][0] - points[i - 1][0]) * r,
        points[i - 1][1] + (points[i][1] - points[i - 1][1]) * r,
      ];
    }
    acc += d;
  }
  return points[points.length - 1];
}