import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { FLAT_TYPE_OPTIONS, INCOME_MIN } from "../constants";
import type { FlatType } from "../types";
import type { BudgetInputs, FirstTimers, Household } from "../utils/budgetStorage";
import { currency } from "../utils/format";
import {
  FLAT_LABELS,
  INCOME_CEILINGS,
  SINGLES_MIN_AGE,
  type CeilingSplit,
  type LaunchSnapshot,
} from "../utils/journey";
import { useCountUp } from "../utils/motion";
import { loadSetupSplit, restoreSetupSplit, saveSetupSplit, type SetupSplit } from "../utils/setupStorage";
import { Icon } from "./DashboardUi";
import { MoneySplit } from "./MoneySplit";

type Step = "who" | "income" | "cpf" | "first" | "size" | "result";
const STEPS: Step[] = ["who", "income", "cpf", "first", "size", "result"];

const WHO_OPTIONS: { value: Household; title: string; body: string }[] = [
  { value: "couple", title: "A couple", body: "Married, engaged, or buying with family." },
  { value: "single", title: "Just me", body: `Singles aged ${SINGLES_MIN_AGE} or over can buy a 2-room Flexi.` },
];

const SINGLE_FIRST_OPTIONS: { value: FirstTimers; title: string; body: string }[] = [
  { value: "both", title: "Yes", body: "You haven't bought a flat from HDB or had a housing grant." },
  { value: "none", title: "No", body: "You've bought from HDB or had a grant before." },
];

const QUESTION_COUNT = STEPS.length - 1;

const FIRST_OPTIONS: { value: FirstTimers; title: string; body: string }[] = [
  { value: "both", title: "Yes, for both of us", body: "Neither of you has bought a flat from HDB or had a housing grant." },
  { value: "one", title: "For one of us", body: "One of you has owned an HDB flat or had a grant before." },
  { value: "none", title: "No, for neither", body: "You've both bought from HDB before." },
];

type SetupFlowProps = {
  combinedIncome: number;
  budget: BudgetInputs;
  flatType: FlatType;
  /** The ceiling with the answers so far; CPF counts as zero until it is given. */
  draft: CeilingSplit | null;
  grant: number;
  monthlyCpf: number;
  sizePrices: Partial<Record<FlatType, { from: number; launch: string }>>;
  launch: LaunchSnapshot | null;
  onIncomeChange: (value: number) => void;
  onBudgetChange: (patch: Partial<BudgetInputs>) => void;
  onFlatTypeChange: (value: FlatType) => void;
  onClose: (finished: boolean) => void;
  onSeeProjects: () => void;
};

export function SetupFlow({
  combinedIncome,
  budget,
  flatType,
  draft,
  grant,
  monthlyCpf,
  sizePrices,
  launch,
  onIncomeChange,
  onBudgetChange,
  onFlatTypeChange,
  onClose,
  onSeeProjects,
}: SetupFlowProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const returning = budget.cpfOa !== null;
  const single = budget.household === "single";
  const [savedAtOpen] = useState(loadSetupSplit);
  const [split, setSplit] = useState<SetupSplit>(() => {
    // Use each person's figures only if they still add up to the totals, which Budget can change.
    const saved = savedAtOpen;
    const sum = (a: number | null, b: number | null) => (a ?? 0) + (b ?? 0);
    if (
      saved &&
      returning &&
      sum(saved.incomeYou, saved.incomePartner) === combinedIncome &&
      sum(saved.cpfYou, saved.cpfPartner) === budget.cpfOa
    )
      return saved;
    return {
      incomeYou: returning ? combinedIncome : null,
      incomePartner: null,
      cpfYou: returning ? budget.cpfOa : null,
      cpfPartner: null,
    };
  });

  const incomeTotal = (split.incomeYou ?? 0) + (split.incomePartner ?? 0);
  const cpfGiven = split.cpfYou !== null || split.cpfPartner !== null;
  const cpfTotal = (split.cpfYou ?? 0) + (split.cpfPartner ?? 0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  // Each step starts at its question, so screen readers hear it and the keyboard starts there.
  useEffect(() => {
    const field = dialogRef.current?.querySelector<HTMLElement>(
      ".setup-question input, .setup-question [aria-checked='true']",
    );
    (field ?? headingRef.current)?.focus({ preventScroll: true });
  }, [stepIndex]);

  const updateSplit = (patch: Partial<SetupSplit>) => {
    const next = { ...split, ...patch };
    setSplit(next);
    saveSetupSplit(next);
    const income = (next.incomeYou ?? 0) + (next.incomePartner ?? 0);
    if (income >= INCOME_MIN) onIncomeChange(income);
    if ("cpfYou" in patch || "cpfPartner" in patch) {
      const given = next.cpfYou !== null || next.cpfPartner !== null;
      onBudgetChange({ cpfOa: given ? (next.cpfYou ?? 0) + (next.cpfPartner ?? 0) : null });
    }
  };

  // Switching to a single buyer drops the partner's figures and points at a 2-room Flexi.
  const chooseHousehold = (household: Household) => {
    if (household === budget.household) return;
    const next = household === "single" ? { ...split, incomePartner: null, cpfPartner: null } : split;
    setSplit(next);
    saveSetupSplit(next);
    const income = (next.incomeYou ?? 0) + (next.incomePartner ?? 0);
    if (income >= INCOME_MIN) onIncomeChange(income);
    const cpfGivenNext = next.cpfYou !== null || next.cpfPartner !== null;
    onBudgetChange({
      household,
      age: null,
      cpfOa: cpfGivenNext ? (next.cpfYou ?? 0) + (next.cpfPartner ?? 0) : budget.cpfOa,
      firstTimers: household === "single" && budget.firstTimers === "one" ? "both" : budget.firstTimers,
    });
    if (household === "single") onFlatTypeChange("2-room");
  };
  const ceiling = single ? INCOME_CEILINGS.singles : INCOME_CEILINGS.newFlat;

  const canContinue =
    step === "income" ? incomeTotal >= INCOME_MIN : step === "cpf" ? cpfGiven : true;

  const next = (event?: FormEvent) => {
    event?.preventDefault();
    if (!canContinue) return;
    setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
  };
  const back = () => setStepIndex((index) => Math.max(index - 1, 0));

  const isResult = step === "result";
  const close = (finished: boolean) => {
    if (!finished) restoreSetupSplit(savedAtOpen);
    onClose(finished);
  };

  return (
    <dialog
      ref={dialogRef}
      className="setup"
      aria-labelledby="setup-title"
      onCancel={(event) => {
        event.preventDefault();
        close(isResult);
      }}
    >
      <div className="setup-frame">
        <header className="setup-head">
          <div className="setup-brand">
            <span className="brand-mark" aria-hidden="true">
              <span />
            </span>
            <span>{isResult ? "Your numbers" : `Question ${stepIndex + 1} of ${QUESTION_COUNT}`}</span>
          </div>
          <div
            className="setup-progress"
            role="progressbar"
            aria-label="Setup progress"
            aria-valuemin={0}
            aria-valuemax={QUESTION_COUNT}
            aria-valuenow={Math.min(stepIndex, QUESTION_COUNT)}
          >
            {STEPS.slice(0, QUESTION_COUNT).map((name, index) => (
              <span key={name} className={index < stepIndex ? "is-done" : index === stepIndex ? "is-current" : ""} />
            ))}
          </div>
          <button
            type="button"
            className="round-btn"
            aria-label={isResult ? "Close" : "Close without saving"}
            onClick={() => close(isResult)}
          >
            <Icon name="close" />
          </button>
        </header>

        {isResult ? (
          <Result
            draft={draft}
            grant={grant}
            monthlyCpf={monthlyCpf}
            flatType={flatType}
            launch={launch}
            income={combinedIncome}
            headingRef={headingRef}
            onDone={() => onClose(true)}
            onSeeProjects={onSeeProjects}
            onBack={back}
          />
        ) : (
          <div className="setup-body">
            <form className="setup-question" key={step} onSubmit={next} noValidate>
              {step === "who" && (
                <>
                  <Question
                    headingRef={headingRef}
                    title="Who's buying?"
                    lede="It decides which flats and grants you can get."
                  />
                  <Choices
                    label="Who's buying"
                    value={budget.household}
                    options={WHO_OPTIONS.map((option) => ({ ...option, key: option.value }))}
                    onChange={chooseHousehold}
                  />
                </>
              )}

              {step === "income" && (
                <>
                  <Question
                    headingRef={headingRef}
                    title={single ? "What do you earn a month?" : "What do you each earn a month?"}
                    lede="Before CPF and tax. HDB averages the 12 months before you apply, so include regular allowances."
                  />
                  <div className="setup-pair">
                    <Amount
                      id="setup-income-you"
                      label="You"
                      value={split.incomeYou}
                      max={30000}
                      onChange={(value) => updateSplit({ incomeYou: value })}
                    />
                    {!single && (
                      <Amount
                        id="setup-income-partner"
                        label="Your partner"
                        value={split.incomePartner}
                        max={30000}
                        onChange={(value) => updateSplit({ incomePartner: value })}
                      />
                    )}
                  </div>
                  {incomeTotal > 0 && (
                    <p className={`setup-total ${incomeTotal > ceiling ? "is-caution" : single ? "is-positive" : ""}`.trim()}>
                      <Icon name={incomeTotal > ceiling ? "alert" : single ? "check" : "team"} />
                      {incomeTotal > ceiling
                        ? `${currency(incomeTotal)}${single ? "" : " together"} is above HDB's ${currency(ceiling)} ceiling for new flats.`
                        : single
                          ? `Within HDB's ${currency(ceiling)} ceiling for singles.`
                          : `${currency(incomeTotal)} a month together.`}
                    </p>
                  )}
                </>
              )}

              {step === "cpf" && (
                <>
                  <Question
                    headingRef={headingRef}
                    title={single ? "How much have you saved?" : "How much have you saved?"}
                    lede="Your CPF Ordinary Account, as shown in the CPF app. Enter 0 if none."
                  />
                  <div className="setup-pair">
                    <Amount
                      id="setup-cpf-you"
                      label="You"
                      value={split.cpfYou}
                      max={2000000}
                      onChange={(value) => updateSplit({ cpfYou: value })}
                    />
                    {!single && (
                      <Amount
                        id="setup-cpf-partner"
                        label="Your partner"
                        value={split.cpfPartner}
                        max={2000000}
                        onChange={(value) => updateSplit({ cpfPartner: value })}
                      />
                    )}
                  </div>
                  {cpfGiven && (
                    <p className="setup-total">
                      <Icon name="piggy" />
                      {currency(cpfTotal)} today, growing by about {currency(monthlyCpf)} a month until keys.
                    </p>
                  )}
                  <Amount
                    id="setup-cash"
                    label="Cash you could put in (optional)"
                    value={budget.cash}
                    max={2000000}
                    onChange={(value) => onBudgetChange({ cash: value })}
                  />
                </>
              )}

              {step === "first" && (
                <>
                  <Question
                    headingRef={headingRef}
                    title="Is this your first flat from HDB?"
                    lede={`This decides the Enhanced CPF Housing Grant, worth up to ${single ? "S$ 60,000 for singles" : "S$ 120,000"}.`}
                  />
                  <Choices
                    label="First-timer status"
                    value={budget.firstTimers}
                    options={(single ? SINGLE_FIRST_OPTIONS : FIRST_OPTIONS).map((option) => ({ ...option, key: option.value }))}
                    onChange={(value) => onBudgetChange({ firstTimers: value })}
                  />
                  <p className={`setup-total ${grant > 0 ? "is-positive" : ""}`.trim()}>
                    <Icon name="sparkle" />
                    {grant > 0
                      ? `Grant of ${currency(grant)} at your income.`
                      : budget.firstTimers === "none"
                        ? single
                          ? "No grant, since you've bought before."
                          : "No grant, since neither of you is a first-timer."
                        : `No grant above ${currency(single ? INCOME_CEILINGS.ehgSingles : INCOME_CEILINGS.ehg)} a month of income.`}
                  </p>
                </>
              )}

              {step === "size" && (
                <>
                  <Question
                    headingRef={headingRef}
                    title="Which size are you looking at?"
                    lede={`Prices from the newest launch that had each size. You can switch any time.`}
                  />
                  <Choices
                    label="Flat size"
                    value={flatType}
                    className="setup-sizes"
                    options={FLAT_TYPE_OPTIONS.map((option) => {
                      const price = sizePrices[option.value];
                      const fits = price && draft ? price.from <= draft.price : null;
                      return {
                        key: option.value,
                        value: option.value,
                        title: FLAT_LABELS[option.value],
                        body: price ? `From ${currency(price.from)}, ${price.launch}` : "No recent prices",
                        tag:
                          fits === null ? undefined : fits ? (
                            <span className="pill pill-positive">Within reach</span>
                          ) : (
                            <span className="pill pill-caution">Above ceiling</span>
                          ),
                      };
                    })}
                    onChange={onFlatTypeChange}
                  />
                </>
              )}

              <div className="setup-actions">
                {stepIndex > 0 && (
                  <button type="button" className="btn btn-ghost" onClick={back}>
                    Back
                  </button>
                )}
                <button type="submit" className="btn btn-primary" disabled={!canContinue}>
                  {step === "size" ? "See my numbers" : "Continue"}
                  <Icon name="arrow" />
                </button>
              </div>
            </form>

            <LivePanel draft={incomeTotal >= INCOME_MIN ? draft : null} cpfGiven={cpfGiven || returning} />
          </div>
        )}
      </div>
    </dialog>
  );
}

function Question({
  title,
  lede,
  headingRef,
}: {
  title: string;
  lede: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="setup-q">
      <h2 id="setup-title" ref={headingRef} tabIndex={-1}>
        {title}
      </h2>
      <p>{lede}</p>
    </div>
  );
}

function Amount({
  id,
  label,
  value,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number | null;
  max: number;
  onChange: (value: number | null) => void;
}) {
  const [text, setText] = useState(value === null ? "" : value.toLocaleString("en-SG"));
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input input-money input-large">
        <span aria-hidden="true">S$</span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={text}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 9);
            if (digits === "") {
              setText("");
              onChange(null);
              return;
            }
            const amount = Math.min(Number(digits), max);
            setText(amount.toLocaleString("en-SG"));
            onChange(amount);
          }}
        />
      </div>
    </div>
  );
}

function Choices<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: T;
  options: { key: string; value: T; title: string; body: string; tag?: ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const index = Math.max(options.findIndex((option) => option.value === value), 0);
  return (
    <div
      className={`setup-choices ${className}`.trim()}
      role="radiogroup"
      aria-label={label}
      onKeyDown={(event) => {
        const delta =
          event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
        if (!delta) return;
        event.preventDefault();
        const nextIndex = (index + delta + options.length) % options.length;
        const group = event.currentTarget;
        onChange(options[nextIndex].value);
        requestAnimationFrame(() => {
          group.querySelectorAll<HTMLElement>('[role="radio"]')[nextIndex]?.focus();
        });
      }}
    >
      {options.map((option, optionIndex) => (
        <button
          key={option.key}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={optionIndex === index ? 0 : -1}
          className="setup-choice"
          onClick={() => onChange(option.value)}
        >
          <span className="setup-radio" aria-hidden="true" />
          <span className="setup-choice-text">
            <strong>{option.title}</strong>
            <span>{option.body}</span>
          </span>
          {option.tag}
        </button>
      ))}
    </div>
  );
}

// The ceiling building up beside the questions, so each answer shows what it changed.
function LivePanel({ draft, cpfGiven }: { draft: CeilingSplit | null; cpfGiven: boolean }) {
  const shown = useCountUp(draft?.price ?? 0);
  // Every row is part of the figure above; only CPF waits for its answer, since it counts as zero until then.
  const rows = [
    { label: "Loan", amount: draft?.loan ?? 0, waits: false },
    { label: "Grant", amount: draft?.grant ?? 0, waits: false },
    { label: "CPF by keys", amount: draft?.cpf ?? 0, waits: !cpfGiven },
    { label: "Cash", amount: draft?.cash ?? 0, waits: false },
  ];
  return (
    <aside className="setup-live" aria-label="Your price ceiling so far">
      <p className="setup-live-label">Price ceiling so far</p>
      <p className="setup-live-figure">{draft ? currency(Math.round(shown / 1000) * 1000) : "S$ —"}</p>
      <ul className="setup-live-rows">
        {rows.map((row) => {
          const pending = !draft || row.waits;
          return (
            <li key={row.label} className={pending ? "is-pending" : ""}>
              <span>{row.label}</span>
              <strong>{pending ? "To come" : currency(row.amount)}</strong>
            </li>
          );
        })}
      </ul>
      <p className="setup-live-note">
        <Icon name="info" />
        Worked out with HDB's loan rules and CPF's 2026 rates. Your HFE letter is the final word.
      </p>
    </aside>
  );
}

function Result({
  draft,
  grant,
  monthlyCpf,
  flatType,
  launch,
  income,
  headingRef,
  onDone,
  onSeeProjects,
  onBack,
}: {
  draft: CeilingSplit | null;
  grant: number;
  monthlyCpf: number;
  flatType: FlatType;
  launch: LaunchSnapshot | null;
  income: number;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onDone: () => void;
  onSeeProjects: () => void;
  onBack: () => void;
}) {
  // Count up from zero once, so the answer arrives rather than appears.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const shown = useCountUp(revealed ? (draft?.price ?? 0) : 0, 900);
  const flat = FLAT_LABELS[flatType];
  const monthly = draft?.monthly ? Math.round(draft.monthly) : null;
  const cpfCovers = monthly !== null && monthlyCpf >= monthly;

  const facts: { icon: "building" | "sparkle" | "piggy" | "alert"; text: string }[] = [];
  if (launch && launch.priced > 0) {
    facts.push({
      icon: "building",
      text:
        launch.fitting.length > 0
          ? `${launch.fitting.length} of ${launch.priced} projects in the ${launch.label} launch have a ${flat} within this.`
          : `None of the ${launch.priced} projects in the ${launch.label} launch has a ${flat} within this yet. Smaller flats or a later launch may.`,
    });
  }
  if (grant > 0) facts.push({ icon: "sparkle", text: `${currency(grant)} of it is a housing grant you don't pay back.` });
  if (monthly !== null)
    facts.push({
      icon: "piggy",
      text: cpfCovers
        ? `The ${currency(monthly)} monthly repayment can come entirely from CPF, about ${currency(monthlyCpf)} a month.`
        : `CPF covers about ${currency(monthlyCpf)} of the ${currency(monthly)} monthly repayment; the rest is cash.`,
    });
  if (income > INCOME_CEILINGS.newFlat)
    facts.push({ icon: "alert", text: `Your income is above HDB's ${currency(INCOME_CEILINGS.newFlat)} ceiling for new flats.` });

  return (
    <div className="setup-result">
      <div className="setup-result-main">
        <h2 id="setup-title" ref={headingRef} tabIndex={-1}>
          You could buy a flat priced up to
        </h2>
        <p className="setup-result-figure">
          {draft ? currency(Math.round(shown / 1000) * 1000) : "Not enough yet"}
        </p>
        {monthly !== null && draft?.tenure && (
          <p className="setup-result-sub">
            {currency(monthly)} a month over {draft.tenure} years
          </p>
        )}
        {draft && <MoneySplit split={draft} className="setup-result-split" />}
      </div>
      <ul className="setup-facts">
        {facts.map((fact) => (
          <li key={fact.text}>
            {fact.text}
          </li>
        ))}
      </ul>
      <div className="setup-actions">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn btn-ghost" onClick={onSeeProjects}>
          See the projects
        </button>
        <button type="button" className="btn btn-primary" onClick={onDone}>
          Open my dashboard
          <Icon name="arrow" />
        </button>
      </div>
    </div>
  );
}
