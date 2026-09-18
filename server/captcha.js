// 图形验证码：生成 SVG，答案存 Redis（5 分钟有效），登录时校验
import svgCaptcha from 'svg-captcha';
import { setex, get, del } from './redis.js';

const TTL = 5 * 60 * 1000;   // 5 分钟
const KEY_PREFIX = 'captcha:';

/** 生成一对验证码，返回 { id, svg } */
export async function createCaptcha() {
  const captcha = svgCaptcha.create({
    size: 4,              // 4 位字符
    noise: 3,             // 干扰线
    color: true,          // 彩色
    background: '#f7f2e6',
    width: 120,
    height: 40,
    charPreset: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',   // 去掉易混字符 0O1Il
  });
  const id = 'captcha_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  await setex(KEY_PREFIX + id, TTL, captcha.text.toLowerCase());
  return { id, svg: captcha.data };
}

/** 校验验证码，无论成功失败都删除（一次性） */
export async function verifyCaptcha(id, userInput) {
  if (!id || !userInput) return false;
  const key = KEY_PREFIX + id;
  const stored = await get(key);
  await del(key);   // 一次性：立即删除
  if (!stored) return false;
  return stored === String(userInput).toLowerCase();
}
