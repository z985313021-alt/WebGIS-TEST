// 数据管理模块增强工具（成员6 - lidongtian987-dotcom）
// 提供 Excel 模板生成（多类型+字段说明）、数据体检报告 Excel/CSV 导出、示例 GeoJSON/SHP 模板
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const __dirname = dirname(fileURLToPath(import.meta.url));

// 非遗十大门类对照表
const CATEGORY_TABLE = [
  ['民间文学', '如传说、故事、谚语、谜语等口头文学'],
  ['传统音乐', '如古琴艺术、道教音乐、鼓吹乐等'],
  ['传统舞蹈', '如秧歌、花鼓舞、龙舞等'],
  ['传统戏剧', '如京剧、吕剧、梆子戏等'],
  ['曲艺', '如山东快书、琴书、大鼓等'],
  ['传统体育、游艺与杂技', '如武术、杂技、蹴鞠等'],
  ['传统美术', '如剪纸、年画、内画、雕刻等'],
  ['传统技艺', '如陶瓷、琉璃、酿造、织造等'],
  ['传统医药', '如中医正骨、阿胶制作等'],
  ['民俗', '如庙会、祭典、节庆等'],
];

// 山东十六地市对照表
const CITY_TABLE = [
  ['济南市', '历下区、市中区、槐荫区、天桥区、历城区、长清区、章丘区、济阳区、莱芜区、钢城区'],
  ['青岛市', '市南区、市北区、黄岛区、崂山区、城阳区、即墨区、胶州市、平度市、莱西市'],
  ['淄博市', '张店区、淄川区、博山区、临淄区、周村区、桓台县、高青县、沂源县'],
  ['枣庄市', '市中区、薛城区、峄城区、台儿庄区、山亭区、滕州市'],
  ['东营市', '东营区、河口区、垦利区、利津县、广饶县'],
  ['烟台市', '芝罘区、福山区、牟平区、莱山区、蓬莱区、龙口市、莱阳市、莱州市、招远市、栖霞市、海阳市'],
  ['潍坊市', '奎文区、潍城区、寒亭区、坊子区、临朐县、昌乐县、青州市、诸城市、寿光市、安丘市、高密市、昌邑市'],
  ['济宁市', '任城区、兖州区、曲阜市、邹城市、微山县、鱼台县、金乡县、嘉祥县、汶上县、梁山县'],
  ['泰安市', '泰山区、岱岳区、新泰市、肥城市、宁阳县、东平县'],
  ['威海市', '环翠区、文登区、荣成市、乳山市'],
  ['日照市', '东港区、岚山区、五莲县、莒县'],
  ['临沂市', '兰山区、罗庄区、河东区、沂南县、郯城县、沂水县、兰陵县、费县、平邑县、莒南县、蒙阴县、临沭县'],
  ['德州市', '德城区、陵城区、乐陵市、禹城市、宁津县、庆云县、临邑县、齐河县、平原县、夏津县、武城县'],
  ['聊城市', '东昌府区、茌平区、临清市、阳谷县、莘县、东阿县、冠县、高唐县'],
  ['滨州市', '滨城区、沾化区、邹平市、惠民县、阳信县、无棣县、博兴县'],
  ['菏泽市', '牡丹区、定陶区、曹县、单县、成武县、巨野县、郓城县、鄄城县、东明县'],
];

/** 通用模板下载 */
export function createTemplate(type) {
  if (type === 'excel') {
    return createEnhancedExcelTemplate();
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
        {
          type: 'Feature',
          properties: { name: '示例面', category: '传统技艺', batch: 2, city: '淄博市' },
          geometry: {
            type: 'Polygon',
            coordinates: [[[118.0, 36.5], [118.5, 36.5], [118.5, 37.0], [118.0, 37.0], [118.0, 36.5]]],
          },
        },
      ],
    };
    const buffer = Buffer.from(JSON.stringify(geojson, null, 2));
    return { buffer, filename: 'sample.geojson', contentType: 'application/geo+json' };
  }
  if (type === 'shp') {
    throw new Error('SHP 示例模板请由管理员提供 sample-template.zip');
  }
  if (type === 'category') {
    return createCategoryReferenceTemplate();
  }
  if (type === 'city') {
    return createCityReferenceTemplate();
  }
  throw new Error('未知模板类型');
}

/** 增强版 Excel 采集模板（含字段说明 Sheet + 示例数据 + 门类对照 + 地市对照） */
function createEnhancedExcelTemplate() {
  const wb = XLSX.utils.book_new();

  // Sheet1: 采集模板（含表头+示例数据）
  const headers = ['name', 'longitude', 'latitude', 'category', 'batch', 'city', 'district', 'level', 'inheritor', 'description'];
  const samples = [
    ['泰山皮影戏', '117.08', '36.20', '传统戏剧', '1', '泰安市', '泰山区', '国家级', '范正安', '泰山皮影戏又称十不闲，是山东皮影的重要分支'],
    ['潍坊风筝', '119.16', '36.70', '传统技艺', '1', '潍坊市', '寒亭区', '国家级', '杨同科', '潍坊风筝兴于明初，至今已有六百余年历史'],
    ['高密剪纸', '119.75', '36.38', '传统美术', '1', '潍坊市', '高密市', '国家级', '范祚信', '高密剪纸风格粗犷豪放，具有浓厚的地方特色'],
    ['山东大鼓', '116.99', '36.64', '曲艺', '1', '济南市', '市中区', '国家级', '左玉华', '山东大鼓是中国北方最早的大鼓形式之一'],
    ['蹴鞠', '118.05', '36.80', '传统体育、游艺与杂技', '1', '淄博市', '临淄区', '国家级', '马国庆', '蹴鞠起源于春秋战国时期的齐国都城临淄'],
  ];
  const wsData = [headers, ...samples];
  const wsTemplate = XLSX.utils.aoa_to_sheet(wsData);
  wsTemplate['!cols'] = [
    { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 24 }, { wch: 8 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTemplate, '采集模板');

  // Sheet2: 字段说明
  const fieldGuide = [
    ['字段名', '说明', '是否必填', '示例值', '备注'],
    ['name', '非遗项目名称', '是', '泰山皮影戏', '不可为空'],
    ['longitude', '经度（WGS-84）', '是', '117.08', '山东范围：114.5~122.9'],
    ['latitude', '纬度（WGS-84）', '是', '36.20', '山东范围：34.2~38.6'],
    ['category', '非遗门类', '是', '传统戏剧', '参见"门类对照"Sheet'],
    ['batch', '申报批次', '否', '1', '1-5批国家级'],
    ['city', '所在地市', '否', '泰安市', '参见"地市对照"Sheet'],
    ['district', '所在区县', '否', '泰山区', ''],
    ['level', '保护级别', '否', '国家级', '国家级/省级/市级'],
    ['inheritor', '传承人', '否', '范正安', ''],
    ['description', '项目简介', '否', '泰山皮影戏...', '200字以内'],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(fieldGuide);
  wsGuide['!cols'] = [{ wch: 14 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, '字段说明');

  // Sheet3: 门类对照
  const wsCategory = XLSX.utils.aoa_to_sheet([['门类名称', '说明'], ...CATEGORY_TABLE]);
  wsCategory['!cols'] = [{ wch: 24 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsCategory, '门类对照');

  // Sheet4: 地市对照
  const wsCity = XLSX.utils.aoa_to_sheet([['地市', '所辖区县'], ...CITY_TABLE]);
  wsCity['!cols'] = [{ wch: 10 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsCity, '地市对照');

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  return {
    buffer,
    filename: 'heritage_field_survey_template.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

/** 非遗门类对照参考模板 */
function createCategoryReferenceTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([['门类名称', '说明'], ...CATEGORY_TABLE]);
  ws['!cols'] = [{ wch: 24 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws, '非遗十大门类');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  return {
    buffer,
    filename: 'category_reference.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

/** 山东十六地市对照参考模板 */
function createCityReferenceTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([['地市', '所辖区县'], ...CITY_TABLE]);
  ws['!cols'] = [{ wch: 10 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws, '山东十六地市');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  return {
    buffer,
    filename: 'city_reference.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

/** 将体检报告导出为 Excel 工作簿（增强版：多 Sheet + 问题明细 + 评分） */
export function generateHealthReportExcel(report) {
  const wb = XLSX.utils.book_new();

  // Sheet1: 体检汇总（含评分）
  const totalIssues = (report?.outOfBounds ?? 0) + (report?.missingCoord ?? 0) +
    (report?.nullValueCount ?? 0) + (report?.emptyNameCount ?? 0) + (report?.duplicateNames ?? 0);
  const total = report?.total ?? 0;
  const score = total > 0 ? Math.max(0, Math.round(100 - (totalIssues / total) * 100)) : 0;
  const grade = score >= 90 ? 'A（优秀）' : score >= 70 ? 'B（良好）' : score >= 50 ? 'C（合格）' : 'D（不合格）';

  const summaryRows = [
    ['齐鲁非遗空间数据体检报告', ''],
    ['生成时间', new Date().toLocaleString('zh-CN')],
    ['', ''],
    ['一、基本信息', ''],
    ['要素总数', total],
    ['字段列表', (report?.fields ?? []).join('、')],
    ['', ''],
    ['二、质量评分', ''],
    ['数据质量评分', `${score} 分`],
    ['质量等级', grade],
    ['问题总数', totalIssues],
    ['', ''],
    ['三、问题统计', ''],
    ['越界要素数', report?.outOfBounds ?? 0],
    ['缺坐标要素数', report?.missingCoord ?? 0],
    ['空值数量', report?.nullValueCount ?? 0],
    ['无名要素数', report?.emptyNameCount ?? 0],
    ['重名数量', report?.duplicateNames ?? 0],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, '体检汇总');

  // Sheet2: 类型分布明细
  const detailRows = [['要素几何类型', '数量', '占比']];
  const byType = report?.byType ?? {};
  for (const [k, v] of Object.entries(byType)) {
    const pct = total > 0 ? ((v / total) * 100).toFixed(1) + '%' : '0%';
    detailRows.push([k, v, pct]);
  }
  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  wsDetail['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsDetail, '类型明细');

  // Sheet3: 问题要素明细（如果体检报告中包含问题要素列表）
  if (report?.issues && report.issues.length > 0) {
    const issueRows = [['序号', '要素名称', '问题类型', '问题描述']];
    report.issues.forEach((issue, i) => {
      issueRows.push([i + 1, issue.name || '(无名)', issue.type || '', issue.desc || '']);
    });
    const wsIssues = XLSX.utils.aoa_to_sheet(issueRows);
    wsIssues['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 16 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsIssues, '问题要素明细');
  }

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  return { buffer, filename: `health_report_${Date.now()}.xlsx` };
}

/** 将体检报告导出为 CSV（UTF-8-BOM 编码，兼容 Excel/Pandas） */
export function generateHealthReportCSV(report) {
  const total = report?.total ?? 0;
  const totalIssues = (report?.outOfBounds ?? 0) + (report?.missingCoord ?? 0) +
    (report?.nullValueCount ?? 0) + (report?.emptyNameCount ?? 0) + (report?.duplicateNames ?? 0);
  const score = total > 0 ? Math.max(0, Math.round(100 - (totalIssues / total) * 100)) : 0;

  const lines = [
    '指标,数值',
    `要素总数,${total}`,
    `越界要素数,${report?.outOfBounds ?? 0}`,
    `缺坐标要素数,${report?.missingCoord ?? 0}`,
    `空值数量,${report?.nullValueCount ?? 0}`,
    `无名要素数,${report?.emptyNameCount ?? 0}`,
    `重名数量,${report?.duplicateNames ?? 0}`,
    `数据质量评分,${score}`,
    '',
    '几何类型,数量',
  ];
  for (const [k, v] of Object.entries(report?.byType ?? {})) {
    lines.push(`${k},${v}`);
  }
  if (report?.issues && report.issues.length > 0) {
    lines.push('', '序号,要素名称,问题类型,问题描述');
    report.issues.forEach((issue, i) => {
      const name = (issue.name || '(无名)').replace(/,/g, '，');
      const desc = (issue.desc || '').replace(/,/g, '，');
      lines.push(`${i + 1},${name},${issue.type || ''},${desc}`);
    });
  }
  const csv = '\uFEFF' + lines.join('\r\n');
  return { buffer: Buffer.from(csv, 'utf8'), filename: `health_report_${Date.now()}.csv` };
}
