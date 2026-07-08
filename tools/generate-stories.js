/*
 * Перегенерация картинок для историй Telegram (каталог /stories).
 *
 * Картинки рисуются из того же списка цитат и той же функции renderStoryCanvas,
 * что встроены в index.html, поэтому индекс файла N.jpg всегда соответствует
 * индексу цитаты в index.html. Запускать после любого изменения списка цитат.
 *
 * Требуется Playwright с браузером Chromium:
 *   npm i -D playwright && npx playwright install chromium
 * Запуск из корня репозитория:
 *   node tools/generate-stories.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const W = 900, H = 1600, QUALITY = 0.82;

(async () => {
    const root = path.resolve(__dirname, '..');
    const dir = path.join(root, 'stories');
    fs.mkdirSync(dir, { recursive: true });

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('file://' + path.join(root, 'index.html'), { waitUntil: 'load' });

    const n = await page.evaluate(() => quotes.length);
    for (let i = 0; i < n; i++) {
        const dataUrl = await page.evaluate(({ idx, W, H, QUALITY }) => {
            const src = renderStoryCanvas(quotes[idx]);
            const c = document.createElement('canvas');
            c.width = W; c.height = H;
            const ctx = c.getContext('2d');
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(src, 0, 0, W, H);
            return c.toDataURL('image/jpeg', QUALITY);
        }, { idx: i, W, H, QUALITY });
        fs.writeFileSync(path.join(dir, i + '.jpg'), Buffer.from(dataUrl.split(',')[1], 'base64'));
    }

    // Удаляем лишние картинки, если цитат стало меньше
    for (const f of fs.readdirSync(dir)) {
        const m = f.match(/^(\d+)\.jpg$/);
        if (m && Number(m[1]) >= n) fs.unlinkSync(path.join(dir, f));
    }

    console.log('Сгенерировано картинок:', n);
    await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
