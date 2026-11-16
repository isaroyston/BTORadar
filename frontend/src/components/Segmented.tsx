import { arrowNavigate } from "../utils/keyboard";

// A segmented control whose white thumb slides to the chosen option.
// Works as a radio group: one tab stop, arrow keys move the choice.
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  className?: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const index = Math.max(
    options.findIndex((option) => option.value === value),
    0
  );

  return (
    <div
      className={`segmented ${className}`.trim()}
      role="radiogroup"
      aria-label={label}
      style={{ ["--count" as string]: options.length, ["--index" as string]: index }}
      onKeyDown={(event) => {
        const next = arrowNavigate(event, index, options.length, '[role="radio"]');
        if (next !== null) onChange(options[next].value);
      }}
    >
      <span className="segmented-thumb" aria-hidden="true" />
      {options.map((option, optionIndex) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={optionIndex === index ? 0 : -1}
          className="segmented-option"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
