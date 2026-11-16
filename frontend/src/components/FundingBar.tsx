import { currency } from "../utils/format";

export type FundingPart = {
  key: "loan" | "grant" | "cpf" | "cash" | "short";
  label: string;
  amount: number;
};

// How a price is paid for: one bar whose segments grow in, then the amounts beneath.
export function FundingBar({ parts }: { parts: FundingPart[] }) {
  const shown = parts.filter((part) => part.amount > 0);
  const total = Math.max(
    shown.reduce((sum, part) => sum + part.amount, 0),
    1
  );

  return (
    <div className="funding">
      <div
        className="funding-bar"
        role="img"
        aria-label={`Paid for by ${shown.map((part) => `${part.label} ${currency(part.amount)}`).join(", ")}`}
      >
        {shown.map((part, index) => (
          <span
            key={part.key}
            className={`funding-seg funding-${part.key}`}
            style={{ flexGrow: part.amount / total, animationDelay: `${index * 70}ms` }}
          />
        ))}
      </div>
      <dl className="funding-legend">
        {shown.map((part) => (
          <div key={part.key}>
            <dt>
              <span className={`funding-swatch funding-${part.key}`} aria-hidden="true" />
              {part.label}
            </dt>
            <dd>{currency(part.amount)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
