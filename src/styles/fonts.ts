import localFont from 'next/font/local';

// Self-hosted @fontsource files (OFL-1.1), see docs/adr/0001-stack.md "Fonts". Paths are resolved by
// next/font relative to this file, so any layout can import it. next/font only accepts literal
// option values, which is why paths and unicode-ranges are written out instead of shared constants.
//
// The unicode-range values are the ones @fontsource publishes for each subset. They let the browser
// skip a file whose glyphs the page does not use (an English page never downloads Noto Sans Thai).
//
// There is no `fallback` option on purpose: next/font appends it to the variable, and a system font in
// that position would answer for Thai glyphs before Noto Sans Thai. tokens.css ends every stack with
// system-ui, sans-serif instead. adjustFontFallback keeps a size-adjusted Arial in front of it so the
// swap from fallback to web font does not shift layout.

// Display and wordmark: Jost. Preloaded (ADR-0001 "Fonts"): it draws the hero headline,
// so preloading removes the swap shift there. Only the 500 face exists for now: every display role,
// the wordmark and the hero use weight 500, and next/font preloads every face of a family, so the
// unused 400 and 600 cost about 21 kB per page for nothing. T07 adds a face back when the hero's
// lighter second line (DESIGN 5.3) or a bolder first line really needs one.
export const jost = localFont({
  src: [
    {
      path: '../../node_modules/@fontsource/jost/files/jost-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
  ],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
  display: 'swap',
  variable: '--font-display',
  adjustFontFallback: 'Arial',
  preload: true,
});

// Body and UI: Inter. Not preloaded: the size-adjusted Arial fallback keeps layout stable until it swaps in.
export const inter = localFont({
  src: [
    {
      path: '../../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/inter/files/inter-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    },
  ],
  display: 'swap',
  variable: '--font-body',
  adjustFontFallback: 'Arial',
  preload: false,
});

// Thai for both roles. Not preloaded: English pages never need it. Arial has no Thai glyphs, so a metric-adjusted Arial fallback means nothing here.
export const notoSansThai = localFont({
  src: [
    {
      path: '../../node_modules/@fontsource/noto-sans-thai/files/noto-sans-thai-thai-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/noto-sans-thai/files/noto-sans-thai-thai-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/noto-sans-thai/files/noto-sans-thai-thai-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  declarations: [
    { prop: 'unicode-range', value: 'U+02D7,U+0303,U+0331,U+0E01-0E5B,U+200C-200D,U+25CC' },
  ],
  display: 'swap',
  variable: '--font-thai',
  adjustFontFallback: false,
  preload: false,
});

// Put this on <html>: tokens.css reads --font-display, --font-body and --font-thai from there.
export const fontVariables: string = [jost, inter, notoSansThai]
  .map((font) => font.variable)
  .join(' ');
