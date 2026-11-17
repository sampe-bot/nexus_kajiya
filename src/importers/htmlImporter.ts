import { safeParseSlideDocument, formatValidationError, type Slide, type TextElement, type TextStyle, type TextRun, CURRENT_SLIDE_DOCUMENT_VERSION } from '../model/slideSchema';
import { prepareHtml } from './htmlSanitizer';

export type HtmlImportResult =
  | { success: true; document: import('../model/slideSchema').SlideDocument; warnings: string[] }
  | { success: false; errors: string[] };

/** Only sanitized, scriptless HTML reaches the measurement frame. */
export async function importHtml(source: string, signal?: AbortSignal): Promise<HtmlImportResult> {
  let frame: HTMLIFrameElement | undefined;
  let inputWarnings: string[] = [];
  try {
    const prepared = prepareHtml(source);
    inputWarnings = prepared.warnings;
    const warnings = new Set(prepared.warnings);
    warnings.add('文字の書式・改行を保持して取り込みます。画像・図形・背景の装飾は省略されます。');
    if (signal?.aborted) throw new Error('読み込みを中止しました');
    frame = document.createElement('iframe');
    frame.title = 'HTML取り込みの計測';
    frame.setAttribute('sandbox', 'allow-same-origin');
    frame.style.cssText = 'position:fixed;left:-100000px;top:0;width:960px;height:540px;border:0;visibility:hidden;pointer-events:none';
    const loaded = new Promise<void>((resolve, reject) => {
      const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
      const abort = () => { cleanup(); reject(new Error('読み込みを中止しました')); };
      const timer = setTimeout(() => { cleanup(); reject(new Error('HTMLの処理がタイムアウトしました')); }, 5000);
      frame!.onload = () => { cleanup(); resolve(); };
      signal?.addEventListener('abort', abort, { once: true });
    });
    // CSP precedes all input, including input styles. No original meta/base survives.
    frame.srcdoc = '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;"></head><body></body></html>';
    document.body.append(frame);
    await loaded;
    const doc = frame.contentDocument!;
    // Parse sanitized markup in the already restricted document, keeping its CSP.
    const parsedHtml = new DOMParser().parseFromString(prepared.html, 'text/html');
    doc.body.replaceWith(doc.importNode(parsedHtml.body, true));
    for (const attr of [...parsedHtml.documentElement.attributes]) doc.documentElement.setAttribute(attr.name, attr.value);
    for (const sheet of parsedHtml.head.querySelectorAll('style')) doc.head.append(doc.importNode(sheet, true));
    const override = doc.createElement('style');
    override.textContent = `body{min-height:540px}*{animation:none!important;transition:none!important}`;
    doc.head.append(override);
    const win = frame.contentWindow!;

    const style = (el: Element) => win.getComputedStyle(el);
    let roots = [...doc.querySelectorAll<HTMLElement>('[data-nexus-slide]')];
    if (!roots.length) roots = [...doc.querySelectorAll<HTMLElement>('.slide')];
    if (!roots.length) roots = [doc.body];
    if (roots.length > 100) throw new Error('スライドは100枚以下にしてください');
    if (roots.some(a => roots.some(b => a !== b && a.contains(b)))) throw new Error('スライドの入れ子には対応していません');
    const deadline = performance.now() + 5000;
    function color(value: string, fallback: string, label: string): string {
      const m = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
      if (m && (!m[4] || Number(m[4]) === 1)) return '#' + m.slice(1, 4).map(n => Number(n).toString(16).padStart(2, '0')).join('');
      warnings.add(`${label}: 透明色・未対応色を${fallback}へ置換しました`); return fallback;
    }
    const slides: Slide[] = roots.map((root, index) => {
      if (signal?.aborted) throw new Error('読み込みを中止しました');
      const label = `${index + 1}枚目`;
      // Static decks commonly hide inactive pages; reveal each root for measurement only.
      const presentation = style(root);
      if (presentation.visibility === 'hidden' || Number(presentation.opacity) === 0 || presentation.display === 'none') {
        warnings.add(`${label}: ページ切り替え用の非表示状態を解除して取り込みました`);
        if (presentation.display === 'none') root.style.setProperty('display', 'block', 'important');
        root.style.setProperty('visibility', 'visible', 'important');
        root.style.setProperty('opacity', '1', 'important');
      }
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height || Math.abs(rect.width / rect.height - 16 / 9) > 0.01) {
        const target = root === doc.body ? 'body（スライド指定がないため本文全体）' : `<${root.tagName.toLowerCase()}>${root.id ? `#${root.id}` : ''}`;
        throw new Error(`${label}: ${target}の計測サイズは${Math.round(rect.width * 100) / 100} × ${Math.round(rect.height * 100) / 100}pxです。スライドを16:9のサイズにしてください（例: width: 960px; height: 540px、または aspect-ratio: 16 / 9）。サイズを外部CSSで指定している場合は、HTML内のstyleへ含めてください。`);
      }
      const scale = 960 / rect.width;
      const elements: TextElement[] = [];
      const rootStyle = style(root);
      const typography = (el: HTMLElement, inline = false): TextStyle => {
        const s = style(el);
        return {
          ...(inline ? { inlineMarginLeft: parseFloat(s.marginLeft) * scale || 0, inlineMarginRight: parseFloat(s.marginRight) * scale || 0 } : {}),
          fontFamily: s.fontFamily, fontSize: parseFloat(s.fontSize) * scale,
          fontWeight: s.fontWeight, fontStyle: s.fontStyle as TextStyle['fontStyle'],
          lineHeight: s.lineHeight === 'normal' ? 'normal' : parseFloat(s.lineHeight) / parseFloat(s.fontSize),
          letterSpacing: s.letterSpacing === 'normal' ? 0 : parseFloat(s.letterSpacing) * scale,
          color: color(s.color, '#000000', label), textAlign: s.textAlign as TextStyle['textAlign'],
          whiteSpace: s.whiteSpace as TextStyle['whiteSpace'], textTransform: s.textTransform as TextStyle['textTransform'],
          wordBreak: s.wordBreak as TextStyle['wordBreak'], overflowWrap: s.overflowWrap as TextStyle['overflowWrap'],
        };
      };
      const visible = (el: HTMLElement) => {
        const s = style(el);
        return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) !== 0;
      };
      const inlineTree = (node: Node): boolean => {
        if (node.nodeType === 3 || node.nodeName === 'BR') return true;
        if (node.nodeType !== 1) return false;
        const el = node as HTMLElement;
        if (!visible(el)) return true;
        if (!['inline', 'contents'].includes(style(el).display)) return false;
        return [...node.childNodes].every(inlineTree);
      };
      function emit(el: HTMLElement, nodes: ChildNode[], wholeBlock: boolean) {
        const runs: TextRun[] = [];
        let firstSource: DOMRect | undefined;
        const collect = (node: Node, owner: HTMLElement) => {
          if (node.nodeType === 3) {
            const text = node.textContent ?? '';
            if (!text) return;
            if (!firstSource && /\S/.test(text)) {
              const offset = text.search(/\S/);
              const r = doc.createRange(); r.setStart(node, offset); r.setEnd(node, offset + 1);
              firstSource = r.getBoundingClientRect();
            }
            const s = typography(owner, owner !== el);
            runs.push({ text: ['normal', 'nowrap'].includes(s.whiteSpace ?? '') ? text.replace(/\s+/g, ' ') : text, style: s });
          } else if (node.nodeType === 1) {
            const child = node as HTMLElement;
            if (!visible(child) || child.tagName === 'STYLE') return;
            if (child.tagName === 'BR') runs.push({ text: '\n', lineBreak: true, style: typography(owner) });
            else for (const nested of child.childNodes) collect(nested, child);
          }
        };
        for (const node of nodes) collect(node, el);
        if (!firstSource || !runs.some(run => run.text.trim())) return;
        const s = style(el);
        const base = typography(el);
        const bounds = el.getBoundingClientRect();
        const range = doc.createRange(); range.setStartBefore(nodes[0]); range.setEndAfter(nodes[nodes.length - 1]);
        const rangeBox = range.getBoundingClientRect();
        let width = wholeBlock
          ? bounds.width - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight) - parseFloat(s.borderLeftWidth) - parseFloat(s.borderRightWidth)
          : rangeBox.width + 0.5;
        if (width <= 0) return;
        // Preserve a line at subpixel widths when the canvas is scaled to another viewport.
        width += 0.5 / scale;
        // Probe the same inline content to account for baseline metrics and flex/vertical alignment.
        // Coordinates are calibrated using a real glyph rather than an ink-box height estimate.
        const probe = doc.createElement('div');
        const apply = (target: HTMLElement, t: TextStyle) => {
          Object.assign(target.style, {
            marginLeft: `${(t.inlineMarginLeft ?? 0) / scale}px`, marginRight: `${(t.inlineMarginRight ?? 0) / scale}px`,
            fontFamily: t.fontFamily, fontSize: `${t.fontSize / scale}px`, fontWeight: t.fontWeight,
            fontStyle: t.fontStyle, lineHeight: String(t.lineHeight), color: t.color,
            letterSpacing: `${(t.letterSpacing ?? 0) / scale}px`, textAlign: t.textAlign,
            whiteSpace: t.whiteSpace, textTransform: t.textTransform, wordBreak: t.wordBreak, overflowWrap: t.overflowWrap,
          });
        };
        probe.style.cssText = 'all:initial;position:absolute;left:0;top:0;display:block;box-sizing:content-box;visibility:visible;';
        probe.style.width = `${width}px`;
        apply(probe, base);
        let firstProbe: Range | undefined;
        for (const run of runs) {
          if (run.lineBreak) { probe.append(doc.createElement('br')); continue; }
          const span = doc.createElement('span'); span.style.cssText = 'all:initial;display:inline;';
          apply(span, run.style);
          const text = doc.createTextNode(run.text); span.append(text); probe.append(span);
          if (!firstProbe && /\S/.test(run.text)) {
            const offset = run.text.search(/\S/); firstProbe = doc.createRange();
            firstProbe.setStart(text, offset); firstProbe.setEnd(text, offset + 1);
          }
        }
        doc.body.append(probe);
        const probeBox = probe.getBoundingClientRect();
        const glyph = firstProbe!.getBoundingClientRect();
        let x = (firstSource.left - rect.left - (glyph.left - probeBox.left)) * scale;
        let y = (firstSource.top - rect.top - (glyph.top - probeBox.top)) * scale;
        const height = probeBox.height * scale;
        width *= scale;
        if (x + width > 960 && x + width - 960 <= 0.55) width = 960 - x;
        probe.remove();
        if (el.tagName === 'LI' && s.listStyleType !== 'none') {
          const siblings = [...el.parentElement!.children].filter(node => node.tagName === 'LI');
          const ordinal = Number(el.getAttribute('value') ?? (Number(el.parentElement!.getAttribute('start') ?? 1) + siblings.indexOf(el)));
          runs.unshift({ text: el.parentElement!.tagName === 'OL' ? `${ordinal}. ` : '• ', style: base });
          x -= base.fontSize; width += base.fontSize;
        }
        // Floating point noise at the origin is not meaningful layout overflow.
        if (Math.abs(x) < .05) x = 0;
        if (Math.abs(y) < .05) y = 0;
        elements.push({ id: `html-${index + 1}-text-${elements.length + 1}`, type: 'text',
          text: runs.map(run => run.text).join(''), runs, style: base, verticalAlign: 'top', x, y, width, height });
        if (elements.length > 2000) throw new Error(`${label}: テキスト要素は2,000個以下にしてください`);
      }
      function visit(el: HTMLElement) {
        if (performance.now() > deadline) throw new Error('HTMLの処理がタイムアウトしました');
        if (!visible(el) || el.tagName === 'STYLE') return;
        const nodes = [...el.childNodes];
        if (!nodes.length) return;
        if (nodes.every(inlineTree)) { emit(el, nodes, true); return; }
        let run: ChildNode[] = [];
        const flush = () => { if (run.length) emit(el, run, false); run = []; };
        for (const node of nodes) {
          if (inlineTree(node)) run.push(node);
          else { flush(); if (node.nodeType === 1) visit(node as HTMLElement); }
        }
        flush();
      }
      visit(root);
      if (!elements.length) throw new Error(`${label}: 編集できるテキストがありません`);
      let background = rootStyle.backgroundColor;
      for (let ancestor = root.parentElement; ancestor && background === 'rgba(0, 0, 0, 0)'; ancestor = ancestor.parentElement) {
        background = style(ancestor).backgroundColor;
      }
      return { id: `html-slide-${index + 1}`, width: 960, height: 540, background: color(background, '#ffffff', label), elements };
    });
    const parsed = safeParseSlideDocument({ kind: 'nexus-kajiya.slide-document', version: CURRENT_SLIDE_DOCUMENT_VERSION, slides });
    if (!parsed.success) throw new Error('スライド領域外の要素、または対応しない値があります。\n' + formatValidationError(parsed.error));
    return { success: true, document: parsed.data, warnings: [...warnings] };
  } catch (error) {
    return { success: false, errors: [error instanceof Error ? error.message : 'HTMLを読み込めませんでした', ...inputWarnings.map(warning => `読み込み時の注意: ${warning}`)] };
  } finally { frame?.remove(); }
}
