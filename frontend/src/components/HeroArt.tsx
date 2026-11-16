import { Icon, type IconName } from "./DashboardUi";

// A drawn scene for the pink headline cards: HDB blocks, clouds, trees, and a badge for the screen.
export type ArtVariant = "budget" | "plan" | "overview" | "quiet";

const BADGE: Record<ArtVariant, IconName | null> = {
  budget: "piggy",
  plan: "calendar",
  overview: "target",
  quiet: null,
};

export function HeroArt({ variant }: { variant: ArtVariant }) {
  const badge = BADGE[variant];
  return (
    <div className="hero-art" aria-hidden="true">
      <svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
        <circle cx="236" cy="40" r="20" className="art-sun" />
        <Cloud x={28} y={42} scale={1} />
        <Cloud x={240} y={84} scale={0.75} />
        <ellipse cx="165" cy="187" rx="138" ry="11" className="art-ground" />
        <Block x={120} y={40} w={62} h={146} d={30} band />
        <Block x={68} y={92} w={54} h={94} d={22} />
        <Cloud x={176} y={58} scale={0.62} />
        <Block x={202} y={112} w={44} h={74} d={20} />
        <Tree x={58} />
        <Tree x={194} small />
        <Tree x={262} />
      </svg>
      {badge && (
        <span className="hero-art-badge">
          <Icon name={badge} />
        </span>
      )}
    </div>
  );
}

function Block({ x, y, w, h, d, band = false }: { x: number; y: number; w: number; h: number; d: number; band?: boolean }) {
  const rows = Math.floor((h - 24) / 13) + 1;
  const cols = Math.max(2, Math.floor((w - 8) / 16));
  const colW = (w - 8) / cols;
  const sideW = (d - 6) / 2 - 3;
  const windows = [];
  for (let r = 0; r < rows; r += 1) {
    const wy = y + 14 + r * 13;
    for (let c = 0; c < cols; c += 1) {
      windows.push(
        <rect key={`f${r}-${c}`} x={x + 4 + c * colW + 3} y={wy} width={colW - 6} height={6} rx={1.5} className="art-window" />,
      );
    }
    for (let c = 0; c < 2; c += 1) {
      const sx = x + w + 3 + c * ((d - 6) / 2);
      const sy = wy - (sx - (x + w)) * 0.5;
      windows.push(
        <polygon
          key={`s${r}-${c}`}
          points={`${sx},${sy} ${sx + sideW},${sy - sideW / 2} ${sx + sideW},${sy - sideW / 2 + 6} ${sx},${sy + 6}`}
          className="art-window-side"
        />,
      );
    }
  }
  return (
    <g>
      <path d={`M${x} ${y}L${x + d} ${y - d / 2}H${x + w + d}L${x + w} ${y}Z`} className="art-roof" />
      <path d={`M${x + w} ${y}L${x + w + d} ${y - d / 2}V${y + h - d / 2}L${x + w} ${y + h}Z`} className="art-side" />
      <rect x={x} y={y} width={w} height={h} className="art-front" />
      {band && <rect x={x} y={y} width={w} height={6} className="art-band" />}
      {windows}
    </g>
  );
}

function Cloud({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className="art-cloud">
      <circle cx="10" cy="10" r="10" />
      <circle cx="26" cy="3" r="14" />
      <circle cx="44" cy="10" r="10" />
      <rect x="10" y="8" width="34" height="12" rx="6" />
    </g>
  );
}

function Tree({ x, small = false }: { x: number; small?: boolean }) {
  const r = small ? 7 : 10;
  return (
    <g>
      <rect x={x - 1.5} y={186 - r - 4} width={3} height={r + 4} rx={1.5} className="art-trunk" />
      <circle cx={x} cy={186 - r - 8} r={r} className="art-leaf" />
      <circle cx={x + r * 0.55} cy={186 - r - 4} r={r * 0.7} className="art-leaf-light" />
    </g>
  );
}
