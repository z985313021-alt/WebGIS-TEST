import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\Administrator\\AppData\\Local\\Temp\\chrome_cdp_profile_' + Date.now();
const targetUrl = process.argv[2] || 'http://localhost:8000/';
const screenshotName = process.argv[3] || 'home_screenshot.png';
const screenshotPath = `C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\3e62cfb3-3982-4c40-a638-c8f4f69e6587\\${screenshotName}`;

console.log(`Launching Chrome to inspect: ${targetUrl}`);

const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--disable-gpu',
  '--no-sandbox',
  `--user-data-dir=${userDataDir}`,
  '--window-size=1280,900',
  'about:blank'
], { stdio: 'ignore' });

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  await sleep(1500);

  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const pages = await listRes.json();
  const page = pages.find(p => p.type === 'page') || pages[0];

  const ws = new WebSocket(page.webSocketDebuggerUrl);

  let id = 1;
  const callbacks = new Map();

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      callbacks.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  ws.onopen = async () => {
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Console.enable');

    // First go to origin to set localStorage guest flag
    await send('Page.navigate', { url: 'http://localhost:8000/about' });
    await sleep(1000);
    console.log(`Setting guest flag in localStorage...`);
    const evalRes = await send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('webgis_guest', '1');
        localStorage.getItem('webgis_guest');
      `
    });
    console.log('localStorage result:', evalRes);
    await sleep(500);

    console.log(`Navigating to ${targetUrl}...`);
    await send('Page.navigate', { url: targetUrl });
    await sleep(3500); // allow map / charts / products to render

    const currentUrlRes = await send('Runtime.evaluate', { expression: 'window.location.href' });
    console.log('Final URL is:', currentUrlRes?.result?.value);

    const scrollY = parseInt(process.argv[4] || '0', 10);
    if (scrollY > 0) {
      console.log(`Scrolling window and .main-area to ${scrollY}...`);
      await send('Runtime.evaluate', {
        expression: `
          window.scrollTo(0, ${scrollY});
          const m = document.querySelector('.main-area');
          if (m) m.scrollTo(0, ${scrollY});
        `
      });
      await sleep(1000);
    }

    const clickSelector = process.argv[5];
    if (clickSelector) {
      console.log(`Clicking ${clickSelector}...`);
      await send('Runtime.evaluate', {
        expression: `
          const el = document.querySelector('${clickSelector}');
          if (el) el.click();
        `
      });
      await sleep(1200);
    }

    const mapInfo = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const p = document.querySelector('.map-panel');
          const canvas = document.querySelector('.map-canvas');
          return {
            panelInner: p ? p.innerHTML.slice(0, 400) : 'null',
            canvasInner: canvas ? canvas.innerHTML.slice(0, 400) : 'null',
            canvasRect: canvas ? canvas.getBoundingClientRect() : null,
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Map info:', JSON.stringify(mapInfo?.result?.value, null, 2));

    console.log('Capturing screenshot...');
    const result = await send('Page.captureScreenshot', { format: 'png' });
    if (result && result.data) {
      writeFileSync(screenshotPath, Buffer.from(result.data, 'base64'));
      console.log(`Screenshot saved to ${screenshotPath}`);
    }

    ws.close();
    chrome.kill();
    try {
      const fs = await import('node:fs');
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
    process.exit(0);
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Console.messageAdded') {
      console.log('[Browser Console]', msg.params.message.text);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.log('[Browser Exception]', JSON.stringify(msg.params.exceptionDetails));
    }
    if (msg.id && callbacks.has(msg.id)) {
      const cb = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      cb(msg.result);
      return;
    }
  };
}

run().catch(async (e) => {
  console.error(e);
  chrome.kill();
  try {
    const fs = await import('node:fs');
    fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch {}
  process.exit(1);
});
