import type { CeilingSplit } from "../utils/journey";
import { currency } from "../utils/format";

const PARTS: { key: "loan" | "grant" | "cpf" | "cash"; label: string }[] = [
  { key: "loan", label: "Loan" },
  { key: "grant", label: "Grant" },
  { key: "cpf", label: "CPF by keys" },
  { key: "cash", label: "Cash" },
];

// One bar for where the price comes from, with a legend that carries the figures.
export function MoneySplit({
  split,
  loanLabel = "Loan",
  className = "",
}: {
  split: CeilingSplit;
  loanLabel?: string;
  className?: string;
}) {
  const parts = PARTS.map((part) => ({
    ...part,
    label: part.key === "loan" ? loanLabel : part.label,
    amount: split[part.key],
  })).filter((part) => part.amount > 0);
  const total = parts.reduce((sum, part) => sum + part.amount, 0);
  if (total <= 0) return null;

  return (
    <div className={`split ${className}`.trim()}>
      <div className="split-bar" aria-hidden="true">
        {parts.map((part) => (
          <span
            key={part.key}
            className={`split-seg split-${part.key}`}
            style={{ flexGrow: part.amount }}
          />
        ))}
      </div>
      <dl className="split-legend">
        {parts.map((part) => (
          <div key={part.key}>
            <dt>
              <span className={`split-dot split-${part.key}`} aria-hidden="true" />
              {part.label}
            </dt>
            <dd>{currency(part.amount)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
