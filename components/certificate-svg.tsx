import { cssFamily } from "@/lib/fonts";
import { baselineFromTop } from "@/lib/pdf/metrics";
import type { Shape } from "@/lib/pdf/presets";
import type { TemplateField } from "@/lib/pdf/types";

type Box = { x: number; y: number; w: number; font: string; size: number; color: string; align: "left" | "center" | "right" };

const anchor = { left: "start", center: "middle", right: "end" } as const;
const anchorX = (b: Box) => (b.align === "left" ? b.x : b.align === "right" ? b.x + b.w : b.x + b.w / 2);

function Line({ text, box, size, opacity }: { text: string; box: Box; size: number; opacity?: number }) {
  return (
    <text
      x={anchorX(box)}
      y={baselineFromTop(box.y, size, box.font)}
      textAnchor={anchor[box.align]}
      fontFamily={`"${cssFamily(box.font)}"`}
      fontSize={size}
      fill={box.color}
      opacity={opacity}
      style={{ whiteSpace: "pre" }}
    >
      {text}
    </text>
  );
}

/**
 * SVG rendering of a certificate in PDF points: preset shapes plus field text, using the
 * same font files and baseline maths as lib/pdf/render.ts. `fit` returns the shrunk font
 * size for long text (omit it for static thumbnails).
 */
export function CertificateSvg({
  width,
  height,
  shapes = [],
  fields,
  values,
  fit,
  showQr = true,
  className,
  title,
}: {
  width: number;
  height: number;
  shapes?: Shape[];
  fields: TemplateField[];
  values: Record<string, string>;
  fit?: (text: string, field: Box) => number;
  showQr?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      {shapes.map((s, i) => {
        switch (s.t) {
          case "rect":
            return (
              <rect
                key={i}
                x={s.x}
                y={s.y}
                width={s.w}
                height={s.h}
                fill={s.fill ?? "none"}
                stroke={s.stroke}
                strokeWidth={s.sw}
                opacity={s.opacity}
              />
            );
          case "circle":
            return <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill ?? "none"} stroke={s.stroke} strokeWidth={s.sw} opacity={s.opacity} />;
          case "line":
            return <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.stroke} strokeWidth={s.sw} opacity={s.opacity} />;
          case "path":
            return <path key={i} d={s.d} fill={s.fill ?? "none"} stroke={s.stroke} strokeWidth={s.sw} opacity={s.opacity} />;
          case "text":
            return <Line key={i} text={s.text} box={s} size={fit ? fit(s.text, s) : s.size} opacity={s.opacity} />;
        }
      })}
      {fields.map((f) => {
        if (f.key === "qr") {
          if (!showQr) return null;
          return <QrGlyph key={f.key} x={f.x} y={f.y} size={f.w} color={f.color} />;
        }
        const text = values[f.key]?.trim();
        if (!text) return null;
        return <Line key={f.key} text={text} box={f} size={fit ? fit(text, f) : f.size} />;
      })}
    </svg>
  );
}

/** Stand-in QR pattern for previews (the real code is generated per certificate). */
function QrGlyph({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const u = size / 25;
  const finder = (fx: number, fy: number) => (
    <g key={`${fx}-${fy}`}>
      <rect x={x + fx * u} y={y + fy * u} width={7 * u} height={7 * u} fill={color} />
      <rect x={x + (fx + 1) * u} y={y + (fy + 1) * u} width={5 * u} height={5 * u} fill="#fff" />
      <rect x={x + (fx + 2) * u} y={y + (fy + 2) * u} width={3 * u} height={3 * u} fill={color} />
    </g>
  );
  const dots: [number, number][] = [
    [9, 1], [11, 2], [13, 1], [10, 4], [12, 5], [9, 7], [14, 8], [16, 9], [1, 9], [3, 10], [5, 9], [8, 11], [10, 10],
    [12, 12], [15, 11], [18, 10], [20, 12], [22, 9], [23, 11], [9, 14], [11, 16], [14, 15], [17, 14], [19, 16], [21, 15],
    [23, 17], [10, 19], [12, 21], [9, 23], [14, 20], [16, 22], [18, 19], [20, 21], [22, 23], [23, 20], [2, 12], [4, 14],
    [6, 12], [13, 18], [15, 17],
  ];
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} fill="#fff" />
      {finder(1, 1)}
      {finder(17, 1)}
      {finder(1, 17)}
      {dots.map(([dx, dy]) => (
        <rect key={`${dx}-${dy}`} x={x + dx * u} y={y + dy * u} width={u * 1.4} height={u * 1.4} fill={color} />
      ))}
    </g>
  );
}
