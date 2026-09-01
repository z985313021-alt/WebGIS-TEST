// 数据层：数据转换/体检 API（T4）
import http from '../http';

export interface HealthReport {
  total: number;
  byType: Record<string, number>;
  outOfBounds: number;
  missingCoord: number;
  nullValueCount: number;
  emptyNameCount: number;
  duplicateNames: number;
  fields: string[];
}

/** shp 多文件上传 → GeoJSON */
export async function convertShp(files: File[]): Promise<object> {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  const { data } = await http.post('/convert/shp', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data;
}

/** excel 上传 → 点 GeoJSON */
export async function convertExcel(file: File, lngColumn: string, latColumn: string, nameColumn: string): Promise<object> {
  const form = new FormData();
  form.append('file', file);
  form.append('lngColumn', lngColumn);
  form.append('latColumn', latColumn);
  form.append('nameColumn', nameColumn);
  const { data } = await http.post('/convert/excel', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data;
}

/** 数据体检 */
export async function checkHealth(geojson: object): Promise<HealthReport> {
  const { data } = await http.post('/health-check', geojson);
  return data;
}
