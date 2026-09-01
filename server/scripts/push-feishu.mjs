// 飞书日志上传（简化版）：用飞书"导入任务"把 docs/feishu-log.md 全量转成飞书文档
// 用法: npm run feishu:push   （凭证读 server/.env）
// 每次运行生成一个最新完整文档（markdown 原生导入，含表格），URL 存到 state 文件并打印
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';
import dotenv from 'dotenv';
dotenv.config(); // 根目录 .env（与 server/index.js 一致）

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const LOG_FILE = 'docs/feishu-log.md';
const STATE_FILE = 'server/data/feishu-doc-state.json';
const BASE = 'https://open.feishu.cn/open-apis';

if (!APP_ID || !APP_SECRET) {
  console.error('缺少 FEISHU_APP_ID / FEISHU_APP_SECRET（检查 server/.env）');
  process.exit(1);
}

async function getToken() {
  const r = await fetch(`${BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });
  const j = await r.json();
  if (j.code !== 0) throw new Error(`token 失败 ${j.code}: ${j.msg}`);
  return j.tenant_access_token;
}

async function main() {
  const token = await getToken();
  const md = readFileSync(LOG_FILE, 'utf8');
  const fileName = `山东非遗实习开发日志_${new Date().toISOString().slice(0, 10)}.md`;

  // 1. 确保有一个存放文件夹（应用云空间根目录）
  const state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : {};
  // 1.1 尽力删除上一个文档（保持"只有一个最新版"，删除失败不阻断）
  if (state.documentToken) {
    try {
      await fetch(`${BASE}/drive/v1/files/${state.documentToken}?type=docx`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('已删除旧文档（保持单版本）');
    } catch { /* 无删除权限等，忽略 */ }
  }
  let folderToken = state.folderToken;
  if (!folderToken) {
    const f = await fetch(`${BASE}/drive/v1/files/create_folder`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '山东非遗实习日志', folder_token: '' }),
    });
    const fj = await f.json();
    if (fj.code !== 0) throw new Error(`建文件夹失败 ${fj.code}: ${fj.msg}`);
    folderToken = fj.data.token;   // create_folder 返回 data.token（不是 node_token）
    state.folderToken = folderToken;
    console.log('已创建文件夹: 山东非遗实习日志');
  }

  // 2. 上传 markdown 文件（multipart/form-data）
  const form = new FormData();
  form.append('file_name', fileName);
  form.append('parent_type', 'explorer');
  form.append('parent_node', folderToken);
  form.append('size', String(Buffer.byteLength(md)));
  form.append('file', new Blob([Buffer.from(md, 'utf8')], { type: 'text/markdown' }), fileName);
  const up = await fetch(`${BASE}/drive/v1/files/upload_all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const upj = await up.json();
  if (upj.code !== 0) throw new Error(`上传失败 ${upj.code}: ${upj.msg}`);
  const fileToken = upj.data.file_token;
  console.log('markdown 已上传:', fileName);

  // 3. 创建导入任务（md → docx）
  const imp = await fetch(`${BASE}/drive/v1/import_tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_extension: 'md',
      file_token: fileToken,
      type: 'docx',
      file_name: '山东非遗实习 · 开发日志',
      point: { mount_type: 1, mount_key: folderToken },
    }),
  });
  const impj = await imp.json();
  if (impj.code !== 0) throw new Error(`导入任务失败 ${impj.code}: ${impj.msg}`);
  const ticket = impj.data.ticket;
  console.log('导入任务已提交，等待转换...');

  // 4. 轮询导入结果
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const q = await fetch(`${BASE}/drive/v1/import_tasks/${ticket}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const qj = await q.json();
    if (qj.code !== 0) throw new Error(`查询任务失败 ${qj.code}: ${qj.msg}`);
    const result = qj.data.result;
    if (result && result.job_status === 0) {
      const docToken = result.token;
      state.documentToken = docToken;
      state.lastUrl = `https://feishu.cn/docx/${docToken}`;
      writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
      console.log(`✅ 导入成功！文档地址: ${state.lastUrl}`);
      return;
    }
    if (result && result.job_status === 2) throw new Error('导入任务失败（job_status=2）');
  }
  throw new Error('导入超时');
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
