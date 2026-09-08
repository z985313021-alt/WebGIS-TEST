/**
 * 开放授权高清真实摄影图库（Wikimedia Commons & Unsplash）
 * 用于首屏背景、模块封面与器物/工艺占位兜底
 */

export const HD_ASSETS = {
  // 首屏/登录大背景：济南大明湖超然楼与齐鲁古建胜景
  heroBg: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Daming_Lake_Jinan.jpg/1280px-Daming_Lake_Jinan.jpg',

  // 文化收尾横幅：曲阜孔庙杏坛木构
  cultureBanner: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Qufu_Confucius_Temple.jpg/1280px-Qufu_Confucius_Temple.jpg',

  // 【地图浏览】封面：潍坊龙头蜈蚣风筝
  featureMap: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Weifang_kite_dragon.jpg/800px-Weifang_kite_dragon.jpg',

  // 【空间分析】封面：鲁班锁与传统榫卯
  featureAnalysis: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=800&q=80',

  // 【旅游路线】封面：济南大明湖超然楼
  featureTravel: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Daming_Lake_Jinan.jpg/1024px-Daming_Lake_Jinan.jpg',

  // 【文创商城】封面：传统中国茶盏陶瓷
  featureShop: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',

  // 通用器物占位（替 🏺）：传统青瓷器物特写
  placeholderPorcelain: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',

  // 织锦刺绣占位（替 🏺）：传统丝绸刺绣纹理
  placeholderSilk: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=800&q=80',

  // 齐鲁传世非遗代表（本地高精原图）
  galleryWeifangKite: encodeURI('/images/技艺非遗/风筝制作技艺（潍坊风筝）.png'),
  galleryZiboGlass: encodeURI('/images/技艺非遗/琉璃烧制技艺.webp'),
  galleryTaishanShadow: encodeURI('/images/传统戏剧非遗/皮影戏（泰山皮影戏）.jpg'),
  galleryYangjiabuPrint: encodeURI('/images/美术非遗/杨家埠木版年画.jpg'),
  galleryLujinBrocade: encodeURI('/images/技艺非遗/鲁锦织造技艺.webp'),
  galleryLuxiuEmbroidery: encodeURI('/images/美术非遗/鲁绣.jpg'),
  galleryGaomiPapercut: encodeURI('/images/美术非遗/剪纸（高密剪纸）.jpg'),
  galleryQufuWoodCarving: encodeURI('/images/美术非遗/木雕（曲阜楷木雕刻）.jpeg'),
};

/**
 * 根据非遗门类或类型获取最匹配的高清摄影兜底图
 */
export function getHeritagePlaceholder(category?: string): string {
  if (!category) return HD_ASSETS.placeholderPorcelain;
  if (
    category.includes('技艺') ||
    category.includes('美术') ||
    category.includes('织') ||
    category.includes('绣') ||
    category.includes('服饰')
  ) {
    return HD_ASSETS.placeholderSilk;
  }
  return HD_ASSETS.placeholderPorcelain;
}
