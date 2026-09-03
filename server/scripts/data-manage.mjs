// 数据管理模块增强工具（成员6）
// 提供 Excel 模板生成、数据体检报告 Excel 导出、示例 GeoJSON/SHP 模板
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const __dirname = dirname(fileURLToPath(import.meta.url));

/** 通用模板下载 */
export function createTemplate(type) {
  if (type === 'excel') {
    const headers = ['name', 'longitude', 'latitude', 'category', 'batch', 'city', 'district'];
    const sample = [
      ['示例非遗名称', '118.5', '36.8', '传统戏剧', '1', '济南市', '历下区'],
      ['示例美食名称', '120.38', '36.16', '传统美食', '2', '青岛市', '市南区'],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'heritage_template');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    return { buffer, filename: 'heritage_template.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  }
  if (type === 'geojson') {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: '示例点', category: '传统戏剧', batch: 1, city: '济南市' },
          geometry: { type: 'Point', coordinates: [118.5, 36.8] },
        },
      ],
    };
    const buffer = Buffer.from(JSON.stringify(geojson, null, 2));
    return { buffer, filename: 'sample.geojson', contentType: 'application/geo+json' };
  }
  if (type === 'shp') {
    throw new Error('SHP 示例模板请由管理员提供 sample-template.zip');
  }
  throw new Error('未知模板类型');
}

/** 将体检报告导出为 Excel 工作簿 */
export function generateHealthReportExcel(report) {
  const wb = XLSX.utils.book_new();

  // 汇总表
  const summaryRows = [
    ['数据体检报告', ''],
    ['生成时间', new Date().toLocaleString('zh-CN')],
    ['要素总数', report?.total ?? 0],
    ['类型分布', JSON.stringify(report?.byType ?? {})],
    ['越界要素数', report?.outOfBounds ?? 0],
    ['缺坐标要素数', report?.missingCoord ?? 0],
    ['空值数量', report?.nullValueCount ?? 0],
    ['无名要素数', report?.emptyNameCount ?? 0],
    ['重名数量', report?.duplicateNames ?? 0],
    ['字段列表', (report?.fields ?? []).join('、')],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, '体检汇总');

  // 明细表：按类型分布展开
  const detailRows = [['要素类型', '数量']];
  for (const [k, v] of Object.entries(report?.byType ?? {})) {
    detailRows.push([k, v]);
  }
  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(wb, wsDetail, '类型明细');

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  return { buffer, filename: `health_report_${Date.now()}.xlsx` };
}
