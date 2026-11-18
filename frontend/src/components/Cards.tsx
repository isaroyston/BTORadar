import { useState, type ReactNode } from "react";
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

// A money field that formats as you type and reports null when cleared.
export function MoneyField({
  id,
  label,
  hint,
  value,
  max,
  placeholder,
  onCommit,
}: {
  id: string;
  label: string;
  hint: string;
  value: number | null;
  max: number;
  placeholder?: string;
  onCommit: (value: number | null) => void;
}) {
  const [text, setText] = useState(value === null ? "" : value.toLocaleString("en-SG"));
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <p className="field-hint" id={`${id}-hint`}>
        {hint}
      </p>
      <div className="input input-money">
        <span aria-hidden="true">S$</span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={text}
          aria-describedby={`${id}-hint`}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 9);
            if (digits === "") {
              setText("");
              onCommit(null);
              return;
            }
            const amount = Math.min(Number(digits), max);
            setText(amount.toLocaleString("en-SG"));
            onCommit(amount);
          }}
        />
      </div>
    </div>
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
