// 轻量后端：天地图 WMTS 代理 + 数据转换中转
// 阶段：骨架，具体转换依赖安装后补全
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
const TIANDITU_TK = process.env.TIANDITU_TK || '{{TIANDITU_TK}}';

app.use(express.json({ limit: '50mb' }));

// 天地图 WMTS 代理：/api/tianditu/vec_w -> 内部拼接 tk 回源
// 避免前端暴露 tk
app.get('/api/tianditu/:type', async (req, res) => {
  const { type } = req.params;
  const { url } = req.query; // 瓦片实际地址由前端按 WMTS 规则拼，这里仅示意
  // TODO: 实际代理逻辑（根据 WMTS KVP 参数回源天地图）
  res.status(501).json({
    msg: 'tianditu proxy placeholder',
    tk: TIANDITU_TK === '{{TIANDITU_TK}}' ? 'NOT_CONFIGURED' : 'configured',
    type,
  });
});

// Shapefile 转换占位
app.post('/api/convert/shp', (req, res) => {
  res.status(501).json({ msg: 'shp->geojson placeholder, implement with shapefile+dbf' });
});

// Excel 转换占位
app.post('/api/convert/excel', (req, res) => {
  res.status(501).json({ msg: 'excel->geojson placeholder, implement with xlsx' });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  if (TIANDITU_TK === '{{TIANDITU_TK}}') {
    console.warn('[server] 警告：TIANDITU_TK 未配置，天地图底图不可用');
  }
});
