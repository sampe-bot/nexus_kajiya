import { describe, it, expect } from 'vitest';
import { prepareHtml } from './htmlSanitizer';

describe('HTML input boundary', () => {
  it('removes executable content and every resource-bearing attribute before DOM parsing', () => {
    const result = prepareHtml('<script>alert(1)</script><base href="https://bad.test"><img src="https://bad.test"><iframe srcdoc="bad"></iframe><p onclick="bad()"><a href="javascript:bad()">Keep</a></p>');
    expect(result.html).toContain('Keep');
    expect(result.html).not.toMatch(/<script|<base|<img|<iframe|onclick|href=/);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
  it('parses escaped CSS URLs and imports, retaining only supported declarations', () => {
    const { html } = prepareHtml('<style>@import "https://bad.test";p{color:red;background:u\\72l(https://bad.test);transform:rotate(2deg);font-size:30px}</style><p>Text</p>');
    expect(html).toContain('color:red');
    expect(html).toContain('font-size:30px');
    expect(html).not.toMatch(/bad.test|transform|@import/);
  });
  it('keeps supported background shorthand and inline layout', () => {
    expect(prepareHtml('<p style="background:#123456;position:absolute;left:20px">Hi</p>').html).toContain('background:#123456');
  });
  it('rejects excessive input and nesting', () => {
    expect(() => prepareHtml('x'.repeat(5 * 1024 * 1024 + 1))).toThrow('5MB');
    expect(() => prepareHtml('<div>'.repeat(110) + 'hello' + '</div>'.repeat(110))).toThrow('入れ子');
  });
});

it('retains aspect ratio and safe custom properties without allowing resource URLs through variables', () => {
  const { html } = prepareHtml('<style>:root{--width:1280px;--height:720px;--bg:#080e1b;--unsafe:url(https://bad.test/a)}.slide{width:var(--width);height:var(--height);aspect-ratio:16/9;background:var(--bg)}</style>');
  expect(html).toContain('--width:1280px');
  expect(html).toContain('--height:720px');
  expect(html).toContain('aspect-ratio:16/9');
  expect(html).toContain('background:var(--bg)');
  expect(html).not.toContain('bad.test');
});
