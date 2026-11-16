import type { ReactNode } from "react";
import { currency } from "../utils/format";
import { Icon, type IconName } from "./DashboardUi";
import { HeroArt, type ArtVariant } from "./HeroArt";

// The screen's headline card: a pink panel holding one figure, with a drawn scene beside it.
export function HeroCard({
  children,
  art,
  className = "",
}: {
  children: ReactNode;
  art?: ArtVariant;
  className?: string;
}) {
  return (
    <section className={`hero ${art ? "has-art" : ""} ${className}`.trim()}>
      <div className="hero-body">{children}</div>
      {art && <HeroArt variant={art} />}
    </section>
  );
}

export type Tile = { key: string; icon: IconName; label: string; amount: number };

// Small white tiles for the parts of a figure: an icon, a label and an amount.
export function StatTiles({ tiles }: { tiles: Tile[] }) {
  const shown = tiles.filter((tile) => tile.amount > 0);
  if (shown.length === 0) return null;
  return (
    <dl className="tiles">
      {shown.map((tile, index) => (
        <div key={tile.key} className={`tile tile-${tile.key}`} style={{ animationDelay: `${index * 50}ms` }}>
          <span className="icon-tile" aria-hidden="true">
            <Icon name={tile.icon} />
          </span>
          <div>
            <dt>{tile.label}</dt>
            <dd>{currency(tile.amount)}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

// The monthly repayment as a white chip with a calendar icon.
export function MonthlyChip({ amount, years, note }: { amount: number; years: number; note?: string }) {
  return (
    <p className="hero-chip">
      <span className="hero-chip-icon" aria-hidden="true">
        <Icon name="calendar" />
      </span>
      <span>
        <strong>{currency(amount)}</strong> a month
        <span className="hero-chip-sub">
          {" "}
          over {years} years{note ? `, as ${note}` : ""}
        </span>
      </span>
    </p>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="note">
      <Icon name="info" />
      <div>{children}</div>
    </div>
  );
}

export function EditChip({ label = "Edit", onClick }: { label?: string; onClick: () => void }) {
  return (
    <button type="button" className="edit-chip" onClick={onClick}>
      <Icon name="edit" />
      {label}
    </button>
  );
}
