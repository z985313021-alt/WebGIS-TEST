// dbf 读取器：处理 GBK 编码的 Chinese dbf 文件
// 旧项目教训：dbf 字段名被截断 + GBK 编码，Excel/UTF-8 乱码
// 返回: { fields: [{name,type,len}], records: [ {fieldName: value} ] }
import { readFileSync } from 'node:fs';
import iconv from 'iconv-lite';

export function readDbf(dbfPath) {
  const buf = readFileSync(dbfPath);
  const numRecords = buf.readUInt32LE(4);
  const headerLen = buf.readUInt16LE(8);
  const recordLen = buf.readUInt16LE(10);

  // 解析字段描述符
  const fields = [];
  let off = 32;
  while (off < headerLen - 1) {
    const nameBytes = buf.subarray(off, off + 11);
    const name = iconv.decode(nameBytes, 'gbk').replace(/\0/g, '').trim();
    const type = String.fromCharCode(buf.readUInt8(off + 11));
    const len = buf.readUInt8(off + 16);
    if (!name) break;
    fields.push({ name, type, len });
    off += 32;
  }

  // 解析记录
  const records = [];
  let pos = headerLen;
  for (let r = 0; r < numRecords; r++) {
    const rec = {};
    const deleted = buf.readUInt8(pos) === 0x2a; // '*'
    pos += 1;
    for (const f of fields) {
      const raw = buf.subarray(pos, pos + f.len);
      pos += f.len;
      rec[f.name] = decodeValue(raw, f);
    }
    if (!deleted) records.push(rec);
  }
  return { fields, records };
}

function decodeValue(raw, f) {
  switch (f.type) {
    case 'C': {
      const s = iconv.decode(raw, 'gbk').replace(/\0/g, '').trim();
      return s;
    }
    case 'N':
    case 'F': {
      const s = iconv.decode(raw, 'gbk').trim();
      if (s === '' ) return null;
      const n = Number(s);
      return isNaN(n) ? null : n;
    }
    case 'D': {
      const s = iconv.decode(raw, 'gbk').trim();
      return s || null;
    }
    case 'L': {
      const c = raw[0];
      if (c === 0x59 || c === 0x54) return true;   // Y / T
      if (c === 0x4e || c === 0x46) return false;  // N / F
      return null;
    }
    default:
      return iconv.decode(raw, 'gbk').replace(/\0/g, '').trim() || null;
  }
}
