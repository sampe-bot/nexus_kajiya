import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const html = (content: string, size = '960px;height:540px') => `<style>.slide{position:relative;width:${size};background:#123456}.slide p{position:absolute;left:80px;top:80px;margin:0;font-size:32px;line-height:1.5;color:#ffffff}</style>${content}`;
async function upload(page: import('@playwright/test').Page, source: string) {
  await page.locator('input[accept="text/html,.html,.htm"]').setInputFiles({ name: 'slides.html', mimeType: 'text/html', buffer: Buffer.from(source) });
}
test('preview, cancellation, multiple pages, editing, and JSON roundtrip', async ({ page }) => {
  await page.goto('/');
  await upload(page, html('<section class="slide"><p>First <strong>bold</strong><br>Next</p></section><section class="slide"><p>Second</p></section>'));
  const preview = page.getByRole('region', { name: 'HTML取り込み確認' });
  await expect(preview).toBeVisible();
  expect(await preview.locator('.rendered-text').innerText()).toBe('First bold\nNext');
  await preview.getByRole('button', { name: '2枚目' }).click();
  await expect(preview.locator('.rendered-text')).toHaveText('Second');
  await preview.getByRole('button', { name: '中止', exact: true }).click();
  await expect(page.locator('.workspace .rendered-text').first()).toHaveText('Shape ideas into slides.');
  await upload(page, html('<section class="slide"><p>First</p></section><section class="slide"><p>Second</p></section>'));
  await page.getByRole('button', { name: 'この内容で取り込む' }).click();
  await page.getByRole('navigation', { name: '編集するスライド' }).getByRole('button', { name: '2枚目' }).click();
  await page.locator('.element-hitbox').dblclick();
  await page.locator('textarea').fill('Edited second');
  await page.locator('textarea').press('Control+Enter');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSONを保存' }).click();
  const file = await download;
  const path = await file.path();
  await page.locator('input[accept="application/json,.json"]').setInputFiles(path!);
  await page.getByRole('navigation', { name: '編集するスライド' }).getByRole('button', { name: '2枚目' }).click();
  await expect(page.locator('.workspace .rendered-text')).toHaveText('Edited second');
});
test('scripts and resource requests never run; invalid input preserves current document', async ({ page }) => {
  await page.goto('/');
  const requests: string[] = [];
  page.on('request', req => { if (req.url().includes('bad.test')) requests.push(req.url()); });
  const dialogs: string[] = []; page.on('dialog', async d => { dialogs.push(d.message()); await d.dismiss(); });
  await upload(page, html('<section class="slide"><p onclick="alert(1)">Safe</p><script>alert(2)</script><img src="https://bad.test/a"><iframe src="https://bad.test/b"></iframe></section><style>@import "https://bad.test/c";p{background:url(https://bad.test/d)}</style>'));
  await expect(page.getByRole('button', { name: 'この内容で取り込む' })).toBeVisible();
  expect(requests).toEqual([]); expect(dialogs).toEqual([]);
  await page.getByRole('button', { name: '中止', exact: true }).click();
  await upload(page, html('<section class="slide"><p>Invalid</p></section>', '600px;height:400px'));
  await expect(page.locator('.error-message')).toContainText('16:9');
  await expect(page.locator('.workspace .rendered-text').first()).toHaveText('Shape ideas into slides.');
  await expect(page.locator('iframe')).toHaveCount(0);
});
test('large slides normalize and nested text is not duplicated', async ({ page }) => {
  await page.goto('/');
  await upload(page, html('<section class="slide"><p>Before <span>inside</span> after</p></section>', '1920px;height:1080px'));
  await expect(page.locator('.import-preview .rendered-text')).toHaveCount(1);
  await expect(page.locator('.import-preview .rendered-text')).toHaveText('Before inside after');
  await page.getByRole('button', { name: 'この内容で取り込む' }).click();
  await expect(page.locator('.rendered-text')).toHaveCSS('font-weight', '400');
});

test('flow, grid, direct text, hidden text and lists keep content without duplication', async ({ page }) => {
  await page.goto('/');
  await upload(page, `<style>.slide{width:960px;height:540px;padding:40px;box-sizing:border-box;display:grid;grid-template-columns:1fr 1fr;gap:20px;background:#eeeeee}p{margin:0;font-size:24px;line-height:1.5}</style><section class="slide"><div>Direct <span>inline<span hidden>secret</span></span><p>Paragraph</p></div><div><p>Grid right</p><ul><li>List one</li><li>List two</li></ul></div></section>`);
  const preview = page.locator('.import-preview');
  await expect(preview).toBeVisible();
  await expect(preview).toContainText('Grid right');
  await expect(preview).toContainText('• List one');
  await expect(preview.locator('.rendered-text')).toHaveCount(5);
  await expect(preview.locator('.preview-canvas')).not.toContainText('secret');
  const line = preview.locator('.rendered-text').filter({ hasText: 'Grid right' });
  expect(await line.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  await page.screenshot({ path: 'test-results/html-preview.png', fullPage: true });
});

test('nested roots, empty slides and out-of-bounds text are rejected', async ({ page }) => {
  await page.goto('/');
  for (const source of [
    html('<section class="slide"><section class="slide"><p>Nested</p></section></section>'),
    html('<section class="slide"></section>'),
    html('<section class="slide"><p style="left:950px;white-space:nowrap">Outside the slide</p></section>'),
  ]) {
    await upload(page, source);
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.import-preview')).toHaveCount(0);
    await expect(page.locator('.workspace .rendered-text').first()).toHaveText('Shape ideas into slides.');
  }
});

for (const [name, sizing] of [
  ['aspect-ratio', '.slide{width:1280px;aspect-ratio:16/9}'],
  ['CSS variables', ':root{--slide-width:1280px;--slide-height:720px}.slide{width:var(--slide-width);height:var(--slide-height)}'],
]) {
  test(`preserves slide sizing with ${name}`, async ({ page }) => {
    await page.goto('/');
    await upload(page, `<style>${sizing}.slide{position:relative;background:#fff}.slide p{position:absolute;left:80px;top:80px;font-size:32px;line-height:1.5;margin:0}</style><section class="slide"><p>Correctly sized slide</p></section>`);
    await expect(page.locator('.import-preview')).toBeVisible();
    await expect(page.locator('.import-preview .rendered-text')).toHaveText('Correctly sized slide');
  });
}

test('imports all 13 pages of the supplied inset/container-query deck without executing scripts', async ({ page }) => {
  await page.goto('/');
  const source = readFileSync('samples/exawizards_ai_driven_management_internal.html', 'utf8');
  await upload(page, source);
  await expect(page.locator('.import-preview')).toBeVisible();
  const pages = page.getByRole('navigation', { name: '取り込みプレビューのページ' });
  await expect(pages.getByRole('button')).toHaveCount(13);
  await expect(page.locator('.import-preview .preview-canvas')).toContainText('経営の仕事こそ');
  await pages.getByRole('button', { name: '13枚目', exact: true }).click();
  await expect(page.locator('.import-preview .preview-canvas')).toContainText('AIを使うことがゴールではない。');
  await expect(page.locator('.import-preview .slide-renderer')).toHaveCSS('background-color', 'rgb(8, 14, 27)');
  await page.screenshot({ path: 'test-results/provided-deck-preview.png', fullPage: true });
});

test('matches original glyph positions across all 13 slides', async ({ page, browser }) => {
  const originalContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 960, height: 540 } });
  const original = await originalContext.newPage();
  const source = readFileSync('samples/exawizards_ai_driven_management_internal.html', 'utf8');
  await original.setContent(source.replace('</head>', '<style>*{transition:none!important;animation:none!important}</style></head>'));
  await page.goto('/');
  await upload(page, source);
  await expect(page.locator('.import-preview')).toBeVisible();
  const glyphs = (root: Element) => {
    const box = root.getBoundingClientRect();
    const result: { text: string; x: number; y: number; width: number; height: number }[] = [];
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walk.nextNode(); node; node = walk.nextNode()) {
      const s = getComputedStyle(node.parentElement!);
      if (s.visibility === 'hidden' || s.display === 'none') continue;
      const text = node.textContent ?? '';
      for (let i = 0; i < text.length; i++) {
        if (/\s/.test(text[i])) continue;
        const range = document.createRange(); range.setStart(node, i); range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const scale = 960 / box.width;
        result.push({ text: text[i], x: (r.left - box.left) * scale, y: (r.top - box.top) * scale, width: r.width * scale, height: r.height * scale });
      }
    }
    return result;
  };
  const report: { slide: number; maxError: number; mismatches: number }[] = [];
  try {
    for (let i = 0; i < 13; i++) {
      await original.locator('.slide').nth(i).evaluate(el => { const h = el as HTMLElement; h.style.opacity = '1'; h.style.visibility = 'visible'; h.style.transform = 'none'; });
      await page.getByRole('navigation', { name: '取り込みプレビューのページ' }).getByRole('button', { name: `${i + 1}枚目`, exact: true }).click();
      const expected = await original.locator('.slide').nth(i).evaluate(glyphs);
      const actual = await page.locator('.import-preview .slide-renderer').evaluate(glyphs);
      expect(actual.map(g => g.text).join(''), `${i + 1}枚目の文字`).toBe(expected.map(g => g.text).join(''));
      const errors = expected.map((g, index) => Math.max(Math.abs(g.x - actual[index].x), Math.abs(g.y - actual[index].y)));
      report.push({ slide: i + 1, maxError: Math.max(...errors), mismatches: errors.filter(error => error > 1.5).length });
      if (errors.some(error => error > 1.5)) console.log('First layout mismatch', i + 1, expected[errors.findIndex(error => error > 1.5)], actual[errors.findIndex(error => error > 1.5)]);
    }
    console.log('Glyph position comparison:', report);
    await page.screenshot({ path: 'test-results/layout-after.png', fullPage: true });
    expect(report.filter(row => row.mismatches > 0)).toEqual([]);
  } finally { await originalContext.close(); }
});

test('rich text formatting survives editing and JSON roundtrip', async ({ page }) => {
  await page.goto('/');
  await upload(page, `<style>.slide{width:960px;height:540px;padding:40px;box-sizing:border-box}h1{font:850 48px/1.2 system-ui;letter-spacing:-1.5px;margin:0}span{color:#008800}</style><section class="slide"><h1>First <span>color</span><br>Next</h1></section>`);
  await page.getByRole('button', { name: 'この内容で取り込む' }).click();
  await expect(page.locator('.workspace .rendered-text')).toHaveCount(1);
  await page.locator('.element-hitbox').dblclick();
  await page.locator('textarea').fill('First! color\nNext');
  await page.locator('textarea').press('Control+Enter');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSONを保存' }).click();
  const file = await download;
  await page.locator('input[accept="application/json,.json"]').setInputFiles((await file.path())!);
  const block = page.locator('.workspace .rendered-text');
  await expect(block).toHaveCSS('font-weight', '850');
  await expect(block).toHaveCSS('letter-spacing', /-1\./);
  await expect(block.locator('span').filter({ hasText: 'color' })).toHaveCSS('color', 'rgb(0, 136, 0)');
  await expect(block.locator('br')).toHaveCount(1);
  expect(await block.innerText()).toBe('First! color\nNext');
});
