// 数据层：数据转换/体检 API（T4 + 成员6增强）
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
  issues?: HealthIssue[];
}

export interface HealthIssue {
  name: string;
  type: string;
  desc: string;
}

export interface WmsLayer {
  name: string;
  title: string;
}

export interface WmsCapabilities {
  ok: boolean;
  url: string;
  layerCount: number;
  layers: WmsLayer[];
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

/** 下载 Excel / GeoJSON / SHP / 门类对照 / 地市对照 模板 */
export function downloadTemplate(type: 'excel' | 'geojson' | 'shp' | 'category' | 'city') {
  const link = document.createElement('a');
  link.href = `/api/template/${type}`;
  const ext = type === 'excel' ? 'xlsx' : type === 'geojson' ? 'geojson' : type === 'shp' ? 'zip' : 'xlsx';
  link.setAttribute('download', `template.${ext}`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** 导出数据体检报告为 Excel */
export async function exportHealthReport(geojson: object) {
  const res = await http.post('/health-check/export', geojson, {
    responseType: 'blob',
  });
  const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `health_report_${Date.now()}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/** 导出数据体检报告为 CSV（成员6增强） */
export async function exportHealthReportCSV(geojson: object) {
  const res = await http.post('/health-check/export-csv', geojson, {
    responseType: 'blob',
  });
  const blob = new Blob([res.data], { type: 'text/csv; charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `health_report_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/** WMS 能力探测 */
export async function probeWms(url: string): Promise<WmsCapabilities> {
  const { data } = await http.get('/wms/capabilities', { params: { url } });
  return data;
}
