import type { Arrangement } from "@grifftab/domain-types";

export interface SvgRenderOptions {
  width: number;
  height: number;
  showMeasureNumbers?: boolean;
}

export interface SvgRenderer {
  renderArrangement(arrangement: Arrangement, options: SvgRenderOptions): string;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export class GriffschriftSvgRenderer implements SvgRenderer {
  renderArrangement(arrangement: Arrangement, options: SvgRenderOptions): string {
    const width = Math.max(options.width, 640);
    const height = Math.max(options.height, 360);

    const headerX = 24;
    const headerY = 32;
    const contentTop = 86;
    const padding = 18;
    const measureWidth = 170;
    const measureHeight = 105;
    const columns = Math.max(1, Math.floor((width - padding * 2) / (measureWidth + 10)));

    const measureGroups = arrangement.measures
      .map((measure, index) => {
        const row = Math.floor(index / columns);
        const col = index % columns;
        const x = padding + col * (measureWidth + 10);
        const y = contentTop + row * (measureHeight + 10);

        const label = options.showMeasureNumbers === false ? "" : `<text x="${x + 8}" y="${y + 18}" font-family="Verdana" font-size="11" fill="#334155">Takt ${measure.index}</text>`;

        const tokenLines = measure.tokens
          .slice(0, 8)
          .map((token, tokenIndex) => {
            const tokenY = y + 36 + tokenIndex * 13;
            const directionSymbol = token.direction === "push" ? "○" : "●";
            const text = `${directionSymbol} R${token.row} K${token.button} (${token.pitch})`;
            return `<text data-token-id="${escapeXml(token.id)}" x="${x + 10}" y="${tokenY}" font-family="Verdana" font-size="11" fill="#0f172a">${escapeXml(text)}</text>`;
          })
          .join("\n");

        return `<g>
  <rect x="${x}" y="${y}" rx="8" ry="8" width="${measureWidth}" height="${measureHeight}" fill="#f8fafc" stroke="#cbd5e1"/>
  ${label}
  ${tokenLines}
</g>`;
      })
      .join("\n");

    const title = escapeXml(arrangement.title);
    const subtitle = escapeXml(`Stimmung: ${arrangement.tuning} | Tempo: ${arrangement.tempoBpm} BPM`);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="100%" height="100%" fill="#ffffff"/>
  <rect x="0" y="0" width="100%" height="72" fill="#e2e8f0"/>
  <text x="${headerX}" y="${headerY}" font-family="Verdana" font-size="24" font-weight="700" fill="#0f172a">${title}</text>
  <text x="${headerX}" y="${headerY + 24}" font-family="Verdana" font-size="12" fill="#1e293b">${subtitle}</text>
  ${measureGroups}
</svg>`;
  }
}
