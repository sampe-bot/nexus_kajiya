import type { CSSProperties } from 'react';
import type { TextStyle } from '../model/slideSchema';

export function textCss(style: TextStyle, width = 960): CSSProperties {
  return {
    color: style.color,
    fontSize: `${style.fontSize / width * 100}cqw`,
    fontWeight: Number(style.fontWeight),
    fontFamily: style.fontFamily,
    fontStyle: style.fontStyle,
    fontSynthesis: style.fontFamily ? 'auto' : undefined,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing === undefined ? undefined : `${style.letterSpacing / width * 100}cqw`,
    marginLeft: style.inlineMarginLeft === undefined ? undefined : `${style.inlineMarginLeft / width * 100}cqw`,
    marginRight: style.inlineMarginRight === undefined ? undefined : `${style.inlineMarginRight / width * 100}cqw`,
    textAlign: style.textAlign,
    whiteSpace: style.whiteSpace ?? 'pre-wrap',
    textTransform: style.textTransform,
    wordBreak: style.wordBreak,
    overflowWrap: style.overflowWrap,
  };
}
