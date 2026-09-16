// 逻辑层：非遗印章图标生成（地图主页与大屏共用同一套视觉符号）
// 印面 = 门类传统色 + 门类单字 + 底部落点尖角

/** 印章图标宽高比（32:36），使用时需等比设置避免拉伸 */
export const SEAL_RATIO = 36 / 32;

/**
 * 生成「非遗印章」图标（SVG data URI）。
 * 同「色 + 单字」只生成一次，缓存复用 —— 地图重绘与散点渲染都会高频调用。
 */
const CACHE = new Map<string, string>();

export function sealIconDataUri(color: string, glyph: string): string {
  const key = color + '|' + glyph;
  const cached = CACHE.get(key);
  if (cached) return cached;
  const ch = (glyph || '遗').slice(0, 1);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="36" viewBox="0 0 32 36">'
    + '<path d="M13.1 25.6 L16 34 L18.9 25.6 Z" fill="' + color + '" stroke="#fff8ec" stroke-width="1.2" stroke-linejoin="round"/>'
    + '<rect x="2.6" y="1.4" width="26.8" height="26.8" rx="4.6" fill="' + color + '" stroke="#fff8ec" stroke-width="2"/>'
    + '<rect x="5.9" y="4.7" width="20.2" height="20.2" rx="2.6" fill="none" stroke="rgba(255,248,236,0.6)" stroke-width="1.1"/>'
    + '<text x="16" y="19" text-anchor="middle" font-family="KaiTi,STKaiti,SimSun,serif" font-size="15.5" font-weight="700" fill="#fff8ec">' + ch + '</text>'
    + '</svg>';
  const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  CACHE.set(key, uri);
  return uri;
}
