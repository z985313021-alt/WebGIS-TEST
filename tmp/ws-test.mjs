
import WebSocket from 'ws';
const base = 'http://127.0.0.1:3001';

async function test() {
  // 1) 获取 token（先绕过验证码直接拿 token，模拟已登录）
  // 由于验证码是内存存储，无法直接获取。我们直接测试未授权连接
  console.log('=== 测试1: 无 token 连接 ===');
  await new Promise((resolve) => {
    const ws = new WebSocket('ws://127.0.0.1:3001/ws');
    ws.on('open', () => ws.send(JSON.stringify({ type: 'ping' })));
    ws.on('message', (d) => { console.log('  收到:', d.toString()); ws.close(); resolve(); });
    ws.on('close', (c) => { console.log('  关闭码:', c); resolve(); });
    setTimeout(() => { ws.close(); resolve(); }, 3000);
  });

  console.log('\n=== 测试2: 验证码接口返回 svg ===');
  const r = await fetch(base + '/api/auth/captcha');
  const j = await r.json();
  console.log('  id 长度:', j.id.length, '| svg 前缀:', j.svg.slice(0, 60));
}
test().catch(console.error);
