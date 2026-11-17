import type { ReactNode } from "react";
import { currency } from "../utils/format";
import { Icon, type IconName } from "./DashboardUi";
import { MoneyParts } from "./MoneySplit";

// The screen's headline card: one figure on a white panel.
export function HeroCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`hero ${className}`.trim()}>
      <div className="hero-body">{children}</div>
    </section>
  );
}

export type Tile = { key: "loan" | "grant" | "cpf" | "cash"; icon: IconName; label: string; amount: number };

// Where a figure's money comes from, as the same split bar Home uses, in its own card.
export function StatTiles({ tiles, title = "Where the money comes from" }: { tiles: Tile[]; title?: string }) {
  if (!tiles.some((tile) => tile.amount > 0)) return null;
  return (
    <section className="card split-card">
      <h2 className="card-title">{title}</h2>
      <MoneyParts parts={tiles.map(({ key, label, amount }) => ({ key, label, amount }))} />
    </section>
  );
}

// The monthly repayment as one plain line under the headline figure.
export function MonthlyChip({ amount, years, note }: { amount: number; years: number; note?: string }) {
  return (
    <p className="hero-monthly">
      <strong>{currency(amount)}</strong> a month over {years} years{note ? `, as ${note}` : ""}
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
