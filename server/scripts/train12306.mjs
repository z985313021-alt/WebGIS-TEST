
// 12306 查询服务（Node 直接调用官方接口，参照 mcp-server-12306 逻辑移植）
// 能力：会话保持 / 余票查询 / 票价查询 / 经停站查询 / 车站搜索
import https from 'node:https';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const INIT_URL = 'https://kyfw.12306.cn/otn/leftTicket/init';
const QUERY_URL = 'https://kyfw.12306.cn/otn/leftTicket/queryI';      // 会自动 302 到 queryG
const PRICE_URL = 'https://kyfw.12306.cn/otn/leftTicketPrice/queryAllPublicPrice';
const ROUTE_URL = 'https://kyfw.12306.cn/otn/czxx/queryByTrainNo';

let stationsCache = null;

/** 城市经纬度表：山东 16 市 + 全国主要城市（用于地图可视化） */
const CITY_POS = {
  // 山东 16 市（取自 shandong-boundary.json center）
  '济南': [117.120128, 36.652069], '青岛': [120.382639, 36.067082], '淄博': [118.047648, 36.814939],
  '枣庄': [117.323725, 34.810487], '东营': [118.664710, 37.434564], '烟台': [121.447935, 37.463822],
  '潍坊': [119.107078, 36.709250], '济宁': [116.587245, 35.414393], '泰安': [117.129063, 36.194968],
  '威海': [122.120419, 37.513068], '日照': [119.461208, 35.428588], '临沂': [118.326443, 35.065282],
  '德州': [116.307428, 37.453968], '聊城': [115.980367, 36.456013], '滨州': [117.970703, 37.382112],
  '菏泽': [115.469381, 35.246531],
  // 全国主要城市
  '北京': [116.407394, 39.904211], '上海': [121.473701, 31.230416], '广州': [113.264385, 23.129112],
  '深圳': [114.057868, 22.543099], '天津': [117.190182, 39.125596], '重庆': [106.551557, 29.563009],
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
  // 铁路干线补充
  '廊坊': [116.703764, 39.518611], '保定': [115.464589, 38.874434], '秦皇岛': [119.600492, 39.935381],
  '唐山': [118.180194, 39.630867], '山海关': [119.775, 39.995], '锦州': [121.126846, 41.095119],
  '天津南': [117.057, 39.056], '天津西': [117.158, 39.159], '天津': [117.190182, 39.125596],
  '泰山': [117.087, 36.189], '泰安': [117.129063, 36.194968], '兖州': [116.783, 35.55],
  '曲阜东': [116.99, 35.58], '滕州东': [117.16, 35.09], '枣庄': [117.323725, 34.810487],
  '徐州': [117.284124, 34.205768], '徐州东': [117.314, 34.273], '蚌埠': [117.389, 32.94],
  '滁州': [118.317, 32.3], '南京南': [118.796, 31.97], '镇江南': [119.42, 32.12],
  '常州北': [119.95, 31.82], '无锡东': [120.45, 31.62], '苏州北': [120.62, 31.43],
  '昆山南': [120.99, 31.38], '上海虹桥': [121.32, 31.20], '上海': [121.473701, 31.230416],
  '石家庄': [114.514859, 38.042306], '邢台东': [114.56, 37.09], '邯郸东': [114.54, 36.62],
  '安阳东': [114.35, 36.12], '鹤壁东': [114.29, 35.75], '新乡东': [113.93, 35.31],
  '郑州东': [113.84, 34.72], '许昌东': [113.88, 34.03], '漯河西': [114.04, 33.58],
  '驻马店西': [113.99, 33.02], '明港东': [114.08, 32.47], '信阳东': [114.13, 32.14],
  '武汉': [114.305393, 30.593099], '合肥': [117.227239, 31.820586], '长沙': [112.938814, 28.228209],
  '南昌': [115.858197, 28.682892], '济南西': [116.86, 36.68], '济南东': [117.05, 36.78],
  '济南': [117.120128, 36.652069], '德州东': [116.31, 37.45], '德州': [116.307428, 37.453968],
  '沧州西': [116.84, 38.30], '沧州': [116.838834, 38.304477], '北京南': [116.38, 39.87],
  '北京': [116.407394, 39.904211], '北京西': [116.32, 39.89], '北京丰台': [116.29, 39.85],
  '张家口': [114.88, 40.82], '大同': [113.30, 40.08], '呼和浩特东': [111.75, 40.84],
  '西安北': [108.93, 34.37], '西安': [108.939465, 34.341574], '洛阳龙门': [112.44, 34.62],
  '郑州': [113.625368, 34.746599], '开封北': [114.31, 34.80], '商丘': [115.65, 34.41],
  '菏泽东': [115.49, 35.24], '济宁北': [116.59, 35.41], '临沂北': [118.35, 35.10],
  '日照西': [119.35, 35.40], '青岛北': [120.36, 36.17], '烟台南': [121.35, 37.40],
  '威海': [122.120419, 37.513068], '潍坊北': [119.15, 36.71], '淄博北': [118.07, 36.84],
  '徐州': [117.284124, 34.205768], '沧州': [116.838834, 38.304477], '德州东': [116.307428, 37.453968],
};
function cityPos(city) {
  if (!city) return null;
  const c = city.replace(/市$/, '');
  return CITY_POS[c] || null;
}
let heritageByCity = null;
/** 加载非遗数据并按城市统计数量（城市名去掉「市」后缀便于匹配车站城市） */
function getHeritageByCity() {
  if (heritageByCity) return heritageByCity;
  try {
    const here = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'));
    const geo = JSON.parse(readFileSync(path.join(here, '..', 'data', 'heritage.geojson'), 'utf8'));
    const map = {};
    for (const f of geo.features || []) {
      let c = (f.properties && f.properties.city) || '';
      c = c.replace(/市$/, '').trim();
      if (!c) continue;
      map[c] = (map[c] || 0) + 1;
    }
    heritageByCity = map;
  } catch { heritageByCity = {}; }
  return heritageByCity;
}
/** 车站名 → 城市（从 stations.json 找） */
function stationCity(name) {
  const stations = getStations();
  const s = stations.find(x => x.name === name);
  return s ? (s.city || '') : '';
}
/** 某城市非遗数量（city 可能是「济宁」或「济宁市」） */
function heritageCountOf(city) {
  if (!city) return 0;
  return getHeritageByCity()[city.replace(/市$/, '')] || 0;
}
function getStations() {
  if (stationsCache) return stationsCache;
  const here = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'));
  stationsCache = JSON.parse(readFileSync(path.join(here, '..', 'data', 'stations.json'), 'utf8'));
  return stationsCache;
}

function request(url, cookie, redirects = 3) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'GET',
      headers: {
        'User-Agent': UA,
        'Referer': INIT_URL,
        ...(cookie ? { 'Cookie': cookie } : {}),
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
    }, (res) => {
      const setCookie = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
      const merged = [cookie, setCookie].filter(Boolean).join('; ');
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        if (redirects <= 0) return reject(new Error('重定向次数过多'));
        return resolve(request(new URL(res.headers.location, url).toString(), merged, redirects - 1));
      }
      let data = Buffer.alloc(0);
      res.on('data', d => data = Buffer.concat([data, d]));
      res.on('end', () => resolve({ status: res.statusCode, body: data.toString('utf8'), cookie: merged }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
    req.end();
  });
}

function ensureCode(name) {
  const stations = getStations();
  let q = (name || '').trim();
  if (q.endsWith('站') && q.length > 2) q = q.slice(0, -1);
  const s = stations.find(x => x.name === q) || stations.find(x => x.code === q);
  return s ? s.code : null;
}

/** 站名匹配：精确相等优先，其次名称包含关系（如「济南西」包含「济南」；「北京南」不含「南京南」） */
function stationMatch(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  // 短名是长名的前缀/子串，且长名去掉方位字后包含短名（如 济南西 vs 济南）
  const stripDir = (n) => n.replace(/东|南|西|北|站/g, '');
  const sa = stripDir(a), sb = stripDir(b);
  if (sa.length >= 2 && sb.length >= 2 && (sa.includes(sb) || sb.includes(sa))) return true;
  return false;
}

function stationName(code) {
  const stations = getStations();
  const s = stations.find(x => x.code === code);
  return s ? s.name : code;
}

/** 城市/车站搜索：中文/拼音/简拼/三字码 */
function searchStations(query, limit = 10) {
  const stations = getStations();
  let q = (query || '').trim().toLowerCase();
  if (q.endsWith('站') && q.length > 2) q = q.slice(0, -1);
  if (!q) return [];
  const exact = [];
  const fuzzy = [];
  for (const s of stations) {
    if (q === s.name.toLowerCase() || q === s.code.toLowerCase() || q === s.pinyin.toLowerCase() || q === s.py_short.toLowerCase()) {
      exact.push(s);
      if (exact.length >= limit) return exact;
    }
  }
  for (const s of stations) {
    if (exact.includes(s)) continue;
    if (s.name.toLowerCase().includes(q) || s.pinyin.includes(q) || s.py_short.includes(q) || s.code.toLowerCase().includes(q) || (s.city && s.city.toLowerCase().includes(q))) {
      fuzzy.push(s);
      if (exact.length + fuzzy.length >= limit) break;
    }
  }
  return [...exact, ...fuzzy].slice(0, limit);
}

/** 余票 + 时刻查询 */
async function queryTickets(from, to, date) {
  const fromCode = ensureCode(from);
  const toCode = ensureCode(to);
  if (!fromCode || !toCode) {
    return { success: false, error: '车站名称无法识别', fromSuggest: searchStations(from, 5), toSuggest: searchStations(to, 5) };
  }
  const init = await request(INIT_URL, '');
  const url = QUERY_URL + '?leftTicketDTO.train_date=' + date + '&leftTicketDTO.from_station=' + fromCode + '&leftTicketDTO.to_station=' + toCode + '&purpose_codes=ADULT';
  const resp = await request(url, init.cookie);
  let j;
  try { j = JSON.parse(resp.body); } catch { return { success: false, error: '12306 响应解析失败（可能被反爬拦截）' }; }
  if (j.httpstatus !== 200) return { success: false, error: '12306 返回异常: ' + (j.messages || resp.status) };
  const raw = (j.data && j.data.result) || [];
  const trains = raw.map(t => {
    const p = t.split('|');
    const bookIdx = p.indexOf('预订');
    return {
      trainNo: bookIdx >= 0 ? (p[bookIdx + 1] || '').trim() : '',
      trainCode: p[3],
      fromStation: stationName(p[6]),
      toStation: stationName(p[7]),
      startTime: p[8],
      arriveTime: p[9],
      duration: p[10],
      seats: {
        business: p[32] && p[32] !== '--' ? p[32] : undefined,
        firstClass: p[31] && p[31] !== '--' ? p[31] : undefined,
        secondClass: p[30] && p[30] !== '--' ? p[30] : undefined,
        hardSleeper: p[28] && p[28] !== '--' ? p[28] : undefined,
        hardSeat: p[29] && p[29] !== '--' ? p[29] : undefined,
        noSeat: p[33] && p[33] !== '--' ? p[33] : undefined,
      },
      canBuy: p[11] === 'Y' || p[11] === 'Q',
    };
  }).filter(x => x.trainCode);
  return { success: true, count: trains.length, trains, fromName: stationName(fromCode), toName: stationName(toCode) };
}

/** 票价查询（所有车次 + 席别价格） */
async function queryPrices(from, to, date) {
  const fromCode = ensureCode(from);
  const toCode = ensureCode(to);
  if (!fromCode || !toCode) return { success: false, error: '车站名称无法识别' };
  const init = await request(INIT_URL, '');
  const url = PRICE_URL + '?leftTicketDTO.train_date=' + date + '&leftTicketDTO.from_station=' + fromCode + '&leftTicketDTO.to_station=' + toCode + '&purpose_codes=ADULT';
  const resp = await request(url, init.cookie);
  let j;
  try { j = JSON.parse(resp.body); } catch { return { success: false, error: '12306 响应解析失败' }; }
  if (!j.data) return { success: false, error: '12306 无票价数据' };
  const PRICE_MAP = { wz_price: '无座', yz_price: '硬座', yw_price: '硬卧', rw_price: '软卧', gr_price: '高级软卧', ze_price: '二等座', zy_price: '一等座', swz_price: '商务座', tdz_price: '特等座', dw_price: '动卧' };
  const fmt = (raw) => {
    if (!raw || raw === '--') return null;
    if (/^\d+$/.test(raw)) {
      const n = String(parseInt(raw));
      return n.length === 1 ? '0.' + n : n.slice(0, -1) + '.' + n.slice(-1);
    }
    return raw;
  };
  const list = (j.data || []).map(item => {
    const d = item.queryLeftNewDTO || {};
    const prices = {};
    for (const [k, name] of Object.entries(PRICE_MAP)) {
      const v = fmt(d[k]);
      if (v) prices[name] = v;
    }
    return { trainCode: d.station_train_code, fromStation: d.from_station_name, toStation: d.to_station_name, startTime: d.start_time, arriveTime: d.arrive_time, duration: d.lishi, prices };
  });
  return { success: true, count: list.length, data: list };
}

/** 经停站查询（某车次全部经停站 + 到发时刻） */
async function queryRouteStations(trainNo, from, to, date) {
  const fromCode = ensureCode(from);
  const toCode = ensureCode(to);
  if (!fromCode || !toCode || !trainNo) return { success: false, error: '参数缺失' };
  const init = await request(INIT_URL, '');
  const url = ROUTE_URL + '?train_no=' + trainNo + '&from_station_telecode=' + fromCode + '&to_station_telecode=' + toCode + '&depart_date=' + date;
  const resp = await request(url, init.cookie);
  let j;
  try { j = JSON.parse(resp.body); } catch { return { success: false, error: '12306 响应解析失败' }; }
  const data = j.data || {};
  const all = (data.data || []).map(s => {
    const city = stationCity(s.station_name);
    const pos = cityPos(city);
    return {
      stationName: s.station_name,
      arriveTime: s.arrive_time,
      startTime: s.start_time,
      stopNum: s.station_no,
      city,
      heritageCount: heritageCountOf(city),
      lng: pos ? pos[0] : null,
      lat: pos ? pos[1] : null,
    };
  });
  // 截取查询区间：锚点用「余票返回的实际乘车区间」（如兖州→北京丰台），
  // 因为 12306 会把兖州这类接驳站作为"济宁"的乘车点返回，交路里没有"济宁"站
  let stops = all;
  try {
    if (all.length > 1) {
      // 用余票接口查该车次实际乘车区间
      // 注意：同一车次（如 G10）可能有多个交路变体（南京南→北京南 / 济南西→北京南…），
      // 需选「起点和终点都能在交路里找到」的那个变体，否则会截到别段
      const tk = await queryTickets(from, to, date);
      const variants = tk.success ? tk.trains.filter(x => x.trainNo === trainNo) : [];
      let match = variants[0] || null;
      if (variants.length > 1) {
        const inRoute = (name) => name && all.some(s => stationMatch(s.stationName, name));
        match = variants.find(v => inRoute(v.fromStation) && inRoute(v.toStation)) || match;
      }
      const fName = (match && match.fromStation) || stationName(fromCode);
      const tName = (match && match.toStation) || stationName(toCode);
      const fIdx = all.findIndex(s => stationMatch(s.stationName, fName));
      const tIdx = all.findIndex(s => stationMatch(s.stationName, tName));
      const f = fIdx >= 0 ? fIdx : 0;
      const t = tIdx >= 0 ? tIdx : all.length - 1;
      stops = all.slice(Math.min(f, t), Math.max(f, t) + 1);
    }
  } catch { /* 截取失败保留全交路 */ }
  return { success: true, trainCode: data.train_name || '', stops, fullRoute: all.length };
}

export { searchStations, queryTickets, queryPrices, queryRouteStations, ensureCode, stationName, getStations, stationCity, heritageCountOf, cityPos };