import type { Arrangement } from "@grifftab/domain-types";

export interface SvgRenderOptions {
  width: number;
  height: number;
  showMeasureNumbers?: boolean;
}

export interface SvgRenderer {
  renderArrangement(arrangement: Arrangement, options: SvgRenderOptions): string;
}

export class GriffschriftSvgRenderer implements SvgRenderer {
  renderArrangement(arrangement: Arrangement, options: SvgRenderOptions): string {
    const title = arrangement.title.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}">\n  <rect x="0" y="0" width="100%" height="100%" fill="#ffffff"/>\n  <text x="16" y="28" font-family="Arial" font-size="18">${title}</text>\n  <text x="16" y="50" font-family="Arial" font-size="12">Renderer stub: layout engine pending</text>\n</svg>`;
  }
}
