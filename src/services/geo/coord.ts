// 逻辑层：坐标系转换（高德 GCJ-02 ↔ 底图 WGS84）
// 天地图 / OSM / 高德瓦片在本项目统一按 WGS84 使用，而高德开放平台的
// 地理编码、路径规划返回 GCJ-02，直接混用会产生数百米级偏移，
// 因此凡是「地址 → 坐标」「坐标 → 地址」的往返都要在此转换。

const A = 6378245.0;
const EE = 0.00669342162296594323;

/** 判断是否在中国境外（境外不做偏移） */
function outOfChina(lng: number, lat: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x: number, y: number): number {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

function transformLng(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
  return ret;
}

/** 偏移量（米 → 度） */
function offset(lng: number, lat: number): [number, number] {
  const dLat = transformLat(lng - 105.0, lat - 35.0);
  const dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  const dLatOut = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * Math.PI);
  const dLngOut = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return [dLngOut, dLatOut];
}

/** GCJ-02 → WGS84（高德坐标转底图坐标，避免经纬度偏移） */
export function gcj02ToWgs84(lng: number, lat: number): [number, number] {
  if (outOfChina(lng, lat)) return [lng, lat];
  const [dLng, dLat] = offset(lng, lat);
  return [lng - dLng, lat - dLat];
}

/** WGS84 → GCJ-02（底图坐标转高德请求坐标） */
export function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  if (outOfChina(lng, lat)) return [lng, lat];
  const [dLng, dLat] = offset(lng, lat);
  return [lng + dLng, lat + dLat];
}
