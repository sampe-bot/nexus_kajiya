import { parse, serialize, type DefaultTreeAdapterTypes as P } from 'parse5';
import * as css from 'css-tree';

export const MAX_HTML_BYTES = 5 * 1024 * 1024;
const tags = new Set('html head body style main article section header footer aside nav div span h1 h2 h3 h4 h5 h6 p ul ol li br strong b em i small a blockquote pre code'.split(' '));
const drop = new Set('script iframe object embed svg canvas table video audio template noscript'.split(' '));
const properties = new Set(('list-style font font-style font-synthesis text-transform text-decoration vertical-align content border border-top border-right border-bottom border-left border-width border-style border-color border-radius outline box-shadow background aspect-ratio inset container-type container-name display position top right bottom left width height min-width max-width min-height max-height margin margin-top margin-right margin-bottom margin-left padding padding-top padding-right padding-bottom padding-left box-sizing overflow overflow-x overflow-y visibility opacity flex flex-direction flex-wrap flex-grow flex-shrink flex-basis align-items align-content align-self justify-content justify-items justify-self gap row-gap column-gap grid-template-columns grid-template-rows grid-column grid-row grid-auto-flow grid-auto-columns grid-auto-rows order color background-color font-size font-weight line-height text-align white-space word-break overflow-wrap letter-spacing font-family list-style-type').split(' '));

export function prepareHtml(source: string): { html: string; warnings: string[] } {
  if (new TextEncoder().encode(source).length > MAX_HTML_BYTES) throw new Error('HTMLは5MB以下にしてください');
  const warnings = new Set<string>();
  const warn = (message: string) => { if (warnings.size < 200) warnings.add(message); };
  const sanitizeCss = (value: string, inline = false) => {
    const ast = css.parse(value, { context: inline ? 'declarationList' : 'stylesheet', parseCustomProperty: true });
    css.walk(ast, {
      enter(node: css.CssNode, item: css.ListItem<css.CssNode>, list: css.List<css.CssNode>) {
        if (node.type === 'Atrule' || node.type === 'Raw') {
          warn('CSSの外部参照・条件ルール・未対応構文を除外しました');
          if (list) list.remove(item);
          return css.walk.skip;
        }
        if (node.type !== 'Declaration') return;
        let unsafe = false;
        css.walk(node.value, n => { if (n.type === 'Url' || n.type === 'Raw') unsafe = true; });
        if (unsafe || (!properties.has(node.property) && !node.property.startsWith('--'))) {
          warn(`CSS「${node.property}」を除外しました`);
          list.remove(item);
        }
      },
    });
    return css.generate(ast).replace(/</g, '\\3c ');
  };
  const doc = parse(source);
  let count = 0;
  function clean(parent: P.ParentNode, depth = 0) {
    if (depth > 100) throw new Error('HTMLの入れ子が深すぎます（上限100階層）');
    const children: P.ChildNode[] = [];
    for (const node of parent.childNodes) {
      if (++count > 20000) throw new Error('HTMLの要素数が多すぎます（上限20,000ノード）');
      if (node.nodeName === '#text') { children.push(node); continue; }
      if (!('tagName' in node)) continue;
      if (drop.has(node.tagName)) { warn(`<${node.tagName}>は取り込み対象外です`); continue; }
      if (node.tagName === 'img' || node.tagName === 'link' || node.tagName === 'meta' || node.tagName === 'base') {
        warn(`<${node.tagName}>・外部リソースは除外しました`); continue;
      }
      node.attrs = node.attrs.filter(attr => {
        if (attr.name === 'style') { attr.value = sanitizeCss(attr.value, true); return true; }
        if (['id', 'class', 'lang', 'dir', 'data-nexus-slide', 'hidden', 'start', 'value'].includes(attr.name)) return true;
        warn(`<${node.tagName}>の属性「${attr.name}」を除外しました`); return false;
      });
      if (node.tagName === 'style') {
        const value = node.childNodes.filter(n => n.nodeName === '#text').map(n => (n as P.TextNode).value).join('');
        node.childNodes = [{ nodeName: '#text', value: sanitizeCss(value), parentNode: node }];
      } else clean(node, depth + 1);
      if (tags.has(node.tagName)) children.push(node);
      else { warn(`<${node.tagName}>は内容のみ取り込みます`); children.push(...node.childNodes); }
    }
    parent.childNodes = children;
  }
  clean(doc);
  return { html: serialize(doc), warnings: [...warnings] };
}
