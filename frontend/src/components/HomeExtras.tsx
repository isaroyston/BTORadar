import { useState, type FormEvent } from "react";
import { useStaticJson } from "../hooks/useStaticJson";
import type { BtoProject } from "../policies/policyConfig";
import type { FlatType } from "../types";
import type { BudgetInputs } from "../utils/budgetStorage";
import { addMonths, formatMonthYear, parseMonth } from "../utils/date";
import { currency } from "../utils/format";

export type ResaleData = {
  from: string;
  to: string;
  youngYears: number;
  sourceUrl: string;
  towns: Record<string, Partial<Record<FlatType, { median: number | null; sales: number; youngMedian: number | null; youngSales: number }>>>;
};

function MoneyInput({ id, label, value, onChange }: { id: string; label: string; value: number | null; onChange: (value: number | null) => void }) {
  const [text, setText] = useState(value === null ? "" : value.toLocaleString("en-SG"));
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input input-money">
        <span aria-hidden="true">S$</span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={text}
          placeholder="0"
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
            setText(digits ? Number(digits).toLocaleString("en-SG") : "");
            onChange(digits ? Number(digits) : null);
          }}
        />
      </div>
    </div>
  );
}

/** The figures from an HFE letter, which replace the estimated loan and grant everywhere. */
export function HfeForm({
  budget,
  estimatedLoan,
  estimatedGrant,
  onBudgetChange,
}: {
  budget: BudgetInputs;
  estimatedLoan: number;
  estimatedGrant: number;
  onBudgetChange: (patch: Partial<BudgetInputs>) => void;
}) {
  const using = budget.hfeLoan !== null;
  const [editing, setEditing] = useState(!using);
  const [loan, setLoan] = useState<number | null>(budget.hfeLoan);
  const [grant, setGrant] = useState<number | null>(budget.hfeGrant);
  const [issued, setIssued] = useState(budget.hfeIssued ?? "");

  const expires = budget.hfeIssued ? addMonths(parseMonth(budget.hfeIssued), 9) : null;
  const now = new Date();
  const monthsLeft = expires ? (expires.getFullYear() - now.getFullYear()) * 12 + expires.getMonth() - now.getMonth() : null;

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (loan === null) return;
    onBudgetChange({ hfeLoan: loan, hfeGrant: grant ?? 0, hfeIssued: /^\d{4}-\d{2}$/.test(issued) ? issued : null });
    setEditing(false);
  };

  if (using && !editing) {
    return (
      <div className="hfe">
        <p>
          Using your letter's loan of <strong>{currency(budget.hfeLoan ?? 0)}</strong> and grant of{" "}
          <strong>{currency(budget.hfeGrant ?? 0)}</strong>
          {expires ? `, valid until ${formatMonthYear(expires)}` : ""}.
          {monthsLeft !== null && monthsLeft <= 2 && (
            <span className="hfe-warn">
              {monthsLeft < 0 ? " It has run out; apply for a new one before you apply for a flat." : " It runs out soon."}
            </span>
          )}
        </p>
        <div className="row-actions">
          <button type="button" className="btn btn-quiet btn-small" onClick={() => setEditing(true)}>
            Change
          </button>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              onBudgetChange({ hfeLoan: null, hfeGrant: null, hfeIssued: null });
              setLoan(null);
              setGrant(null);
              setIssued("");
              setEditing(true);
            }}
          >
            Use our estimates instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="hfe" onSubmit={save}>
      <p>
        HDB's HFE letter confirms your loan and grant. Enter them to replace our estimates of {currency(estimatedLoan)}{" "}
        and {currency(estimatedGrant)}.
      </p>
      <div className="field-row">
        <MoneyInput id="hfe-loan" label="HDB loan" value={loan} onChange={setLoan} />
        <MoneyInput id="hfe-grant" label="Housing grant" value={grant} onChange={setGrant} />
        <div className="field">
          <label htmlFor="hfe-issued">Month issued</label>
          <input id="hfe-issued" className="input" type="month" value={issued} onChange={(event) => setIssued(event.target.value)} />
        </div>
      </div>
      <div className="row-actions">
        <button type="submit" className="btn btn-primary btn-small" disabled={loan === null}>
          Use these figures
        </button>
        {using && (
          <button type="button" className="text-link" onClick={() => setEditing(false)}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// Resale 2-room flats include older non-Flexi ones, so they are named by size only.
function resaleLabel(flatType: FlatType) {
  return flatType === "executive" ? "executive flats" : `${flatType} flats`;
}

function monthLabel(value: string) {
  return formatMonthYear(parseMonth(value));
}

/** One line for a project's detail sheet: the town's resale median for the chosen size. */
export function ResaleNote({ project, flatType }: { project: BtoProject; flatType: FlatType }) {
  const resale = useStaticJson<ResaleData>("/data/resale/medians.json");
  if (!resale) return null;
  const price = project.flatVariants.find((variant) => variant.type === flatType)?.basePrice ?? 0;
  const town = resale.towns[(project.location ?? "").toUpperCase()]?.[flatType];
  const compare = town?.youngMedian ?? town?.median ?? null;
  if (!price) return null;
  return (
    <p className="muted resale-note">
      {compare ? (
        <>
          Resale {resaleLabel(flatType)} in {project.location}
          {town?.youngMedian ? `, under ${resale.youngYears} years old,` : ""} sold for a median{" "}
          <strong>{currency(compare)}</strong> from {monthLabel(resale.from)} to {monthLabel(resale.to)}:{" "}
          {compare > price ? `${currency(compare - price)} more than this flat.` : `${currency(price - compare)} less than this flat.`}
        </>
      ) : (
        <>No resale {resaleLabel(flatType)} sold in {project.location} in the past year.</>
      )}
    </p>
  );
}
