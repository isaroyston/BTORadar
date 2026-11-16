// A segmented control whose white thumb slides to the chosen option.
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
    >
      <span className="segmented-thumb" aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className="segmented-option"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
