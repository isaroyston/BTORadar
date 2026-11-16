import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FLAT_TYPE_OPTIONS } from "../constants";
import type { BtoFlatVariant, BtoProject } from "../policies/policyConfig";
import type {
  BtoDecisionScore,
  BtoScorePreset,
  FlatType,
} from "../types";
import {
  BTO_SCORE_IMPORTANCE_LEVELS,
  BTO_SCORE_IMPORTANCE_MAX,
  scoreBtoProjects,
  type BtoScoreWeights,
} from "../utils/btoScoring";
import { getLaunchMonthSortValue } from "../utils/date";
import { arrowNavigate } from "../utils/keyboard";
import { currency } from "../utils/format";
import { keysAreEstimated, keysLabel, locationMapUrl, projectFacts, waitLabel, type ProjectFact } from "../utils/projectFacts";
import {
  BTO_SOURCE_CREDITS,
  getBtoProjectSourceLabel,
} from "../utils/sourceCredits";
import { Icon, PageHeader } from "./DashboardUi";
import { Segmented } from "./Segmented";

type BtoTabProps = {
  btoLoading: boolean;
  btoError: string | null;
  availableYears: number[];
  yearFilter: string;
  townQuery: string;
  filteredProjects: BtoProject[];
  allProjects: BtoProject[];
  selectedFlatType: FlatType;
  budgetKnown: boolean;
  loanAmount: number;
  ehgGrant: number;
  totalAffordability: number;
  // The price ceiling for one project, using its own signing and keys dates.
  ceilingFor: (project: BtoProject) => number;
  scorePreset: BtoScorePreset;
  scoreWeights: BtoScoreWeights;
  selectedProjectId: string | null;
  savedProjectIds: string[];
  onRetry: () => void;
  onYearFilterChange: (value: string) => void;
  onTownQueryChange: (value: string) => void;
  onFlatTypeChange: (value: FlatType) => void;
  onScorePresetChange: (value: BtoScorePreset) => void;
  onScoreWeightsChange: (value: BtoScoreWeights) => void;
  onSelectProject: (projectId: string) => void;
  onToggleSaved: (projectId: string) => void;
  onResetFilters: () => void;
  onOpenBudget: () => void;
};

type LaunchGroup = {
  key: string;
  projects: BtoProject[];
  totalUnits: number;
  lowestPrice: number | null;
  pricedProjectCount: number;
  distanceProjectCount: number;
  ratingProjectCount: number;
};

type CompareRow = {
  label: string;
  values: Array<{
    projectId: string;
    value: string;
    score?: number;
  }>;
  bestProjectIds?: Set<string>;
};

const MAX_COMPARE_PROJECTS = 4;
const SAVED_KEY = "__saved__";
const SCORE_COMPONENT_ORDER = [
  "affordability",
  "centrality",
  "commute",
  "wait",
  "supply",
] as const;

const NEARBY_LABELS = { education: "Schools", recreation: "Parks", healthcare: "Healthcare", shopping: "Shops" } as const;

const TYPE_NOTES: Record<string, string> = {
  standard: "Standard flats can be sold after the 5-year minimum occupation period.",
  plus: "Plus flats have a 10-year minimum occupation period, and HDB recovers part of the subsidy if you sell.",
  prime: "Prime flats have a 10-year minimum occupation period, stricter resale rules, and HDB recovers part of the subsidy if you sell.",
};

export function BtoTab({
  btoLoading,
  btoError,
  availableYears,
  yearFilter,
  townQuery,
  filteredProjects,
  allProjects,
  selectedFlatType,
  budgetKnown,
  loanAmount,
  ehgGrant,
  totalAffordability,
  ceilingFor,
  scorePreset,
  scoreWeights,
  selectedProjectId,
  savedProjectIds,
  onRetry,
  onYearFilterChange,
  onTownQueryChange,
  onFlatTypeChange,
  onScorePresetChange,
  onScoreWeightsChange,
  onSelectProject,
  onToggleSaved,
  onResetFilters,
  onOpenBudget,
}: BtoTabProps) {
  const [activeLaunch, setActiveLaunch] = useState<string | null>(null);
  const [comparedProjectIds, setComparedProjectIds] = useState<string[]>([]);
  const [detailProjectId, setDetailProjectId] = useState<string | null>(null);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [fitOnly, setFitOnly] = useState(false);
  const hasActiveFilters = yearFilter !== "latest" || townQuery.trim().length > 0;
  const ceiling = Math.floor(totalAffordability / 1000) * 1000;
  const savedSet = useMemo(() => new Set(savedProjectIds), [savedProjectIds]);

  const launchGroups = useMemo(
    () => groupProjectsByLaunch(filteredProjects, selectedFlatType, loanAmount, ehgGrant, totalAffordability, scorePreset, scoreWeights),
    [filteredProjects, selectedFlatType, loanAmount, ehgGrant, totalAffordability, scorePreset, scoreWeights]
  );
  const savedGroup = useMemo<LaunchGroup | null>(() => {
    const saved = allProjects.filter((project) => savedSet.has(project.id));
    if (saved.length === 0) return null;
    const groups = groupProjectsByLaunch(saved, selectedFlatType, loanAmount, ehgGrant, totalAffordability, scorePreset, scoreWeights);
    return {
      key: SAVED_KEY,
      projects: groups.flatMap((group) => group.projects),
      totalUnits: groups.reduce((sum, group) => sum + group.totalUnits, 0),
      lowestPrice: minOrNull(groups.map((group) => group.lowestPrice)),
      pricedProjectCount: groups.reduce((sum, group) => sum + group.pricedProjectCount, 0),
      distanceProjectCount: groups.reduce((sum, group) => sum + group.distanceProjectCount, 0),
      ratingProjectCount: groups.reduce((sum, group) => sum + group.ratingProjectCount, 0),
    };
  }, [allProjects, savedSet, selectedFlatType, loanAmount, ehgGrant, totalAffordability, scorePreset, scoreWeights]);

  const pricedProjectCount = useMemo(
    () =>
      filteredProjects.filter((project) =>
        project.flatVariants.some((variant) => variant.type === selectedFlatType)
      ).length,
    [filteredProjects, selectedFlatType]
  );
  const selectedLaunch =
    activeLaunch === SAVED_KEY && savedGroup
      ? savedGroup
      : launchGroups.find((group) => group.key === activeLaunch) ?? launchGroups[0];
  const launchProjectIds = useMemo(
    () => new Set(selectedLaunch?.projects.map((project) => project.id) ?? []),
    [selectedLaunch]
  );
  const activeComparedProjectIds = useMemo(
    () => comparedProjectIds.filter((projectId) => launchProjectIds.has(projectId)),
    [comparedProjectIds, launchProjectIds]
  );
  const projectScores = useMemo(
    () =>
      selectedLaunch
        ? scoreBtoProjects(
            selectedLaunch.projects,
            { flatType: selectedFlatType, loanAmount, ehgGrant, totalAffordability },
            "buyer-fit",
            scorePreset,
            scoreWeights
          )
        : new Map<string, BtoDecisionScore>(),
    [ehgGrant, loanAmount, scorePreset, scoreWeights, selectedFlatType, selectedLaunch, totalAffordability]
  );
  const priceRanks = useMemo(() => {
    const priced = (selectedLaunch?.projects ?? [])
      .map((project) => ({ id: project.id, price: getSelectedVariant(project, selectedFlatType)?.basePrice }))
      .filter((entry): entry is { id: string; price: number } => entry.price !== undefined)
      .sort((a, b) => a.price - b.price);
    return new Map(priced.map((entry, index) => [entry.id, { rank: index + 1, of: priced.length }]));
  }, [selectedFlatType, selectedLaunch]);
  const hasPriority = Object.values(scoreWeights).some((weight) => weight > 0);
  const detailProject =
    (detailProjectId && allProjects.find((project) => project.id === detailProjectId)) || null;

  const handleToggleCompareProject = (projectId: string) => {
    setComparedProjectIds((current) => {
      const activeCurrent = current.filter((id) => launchProjectIds.has(id));
      if (activeCurrent.includes(projectId)) {
        return activeCurrent.filter((id) => id !== projectId);
      }
      if (activeCurrent.length >= MAX_COMPARE_PROJECTS) return activeCurrent;
      return [...activeCurrent, projectId];
    });
  };

  const tabKeys = [...(savedGroup ? [SAVED_KEY] : []), ...launchGroups.map((group) => group.key)];

  const comparedProjects = activeComparedProjectIds
    .map((projectId) => selectedLaunch?.projects.find((project) => project.id === projectId))
    .filter((project): project is BtoProject => Boolean(project));

  return (
    <section className="screen">
      <PageHeader
        title="Projects"
        subtitle="BTO launches and their prices, checked against your budget."
        action={<SourceCreditLinks />}
      />

      {!budgetKnown && (
        <div className="callout" role="note">
          <p>Set your budget and every project will say whether it fits.</p>
          <button type="button" className="btn btn-quiet" onClick={onOpenBudget}>
            Set your budget
          </button>
        </div>
      )}

      {btoError && (
        <div className="callout callout-caution" role="alert">
          <p>{btoError}</p>
          <button type="button" className="btn btn-quiet" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}

      {btoLoading && (
        <div className="project-grid" aria-label="Loading projects">
          {[0, 1, 2].map((index) => (
            <div key={index} className="card skeleton-card" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      )}

      {!btoLoading && !btoError && (
        <>
          <div className="card filter-bar">
            <div className="filter filter-budget">
              <span className="filter-label">Your budget</span>
              {budgetKnown ? (
                <button type="button" className="budget-pill" onClick={onOpenBudget}>
                  About {currency(ceiling)}
                  <Icon name="edit" />
                </button>
              ) : (
                <button type="button" className="budget-pill budget-pill-empty" onClick={onOpenBudget}>
                  Set your budget
                  <Icon name="arrow" />
                </button>
              )}
            </div>
            <div className="filter">
              <label className="filter-label" htmlFor="flat-size-select">
                Flat size
              </label>
              <select
                id="flat-size-select"
                className="input select only-narrow"
                value={selectedFlatType}
                onChange={(event) => onFlatTypeChange(event.target.value as FlatType)}
              >
                {FLAT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Segmented
                className="only-wide"
                label="Flat size"
                value={selectedFlatType}
                options={FLAT_TYPE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.value === "executive" ? "Executive" : option.label.replace("-room", " room"),
                }))}
                onChange={onFlatTypeChange}
              />
            </div>
            <div className="filter">
              <label className="filter-label" htmlFor="year-filter">
                Launches
              </label>
              <select
                id="year-filter"
                value={yearFilter}
                onChange={(event) => onYearFilterChange(event.target.value)}
                className="input select"
                disabled={availableYears.length === 0}
              >
                <option value="latest">Latest</option>
                <option value="all">All years</option>
                {availableYears.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter filter-grow">
              <label className="filter-label" htmlFor="town-filter">
                Town
              </label>
              <input
                id="town-filter"
                type="search"
                value={townQuery}
                onChange={(event) => onTownQueryChange(event.target.value)}
                placeholder="e.g. Punggol"
                className="input"
              />
            </div>
            <p className="filter-count">
              {filteredProjects.length} projects, {pricedProjectCount} with {selectedFlatType} prices
              {hasActiveFilters && (
                <button type="button" className="text-link" onClick={onResetFilters}>
                  Clear
                </button>
              )}
            </p>
          </div>

          {launchGroups.length === 0 && !savedGroup ? (
            <div className="card empty">
              <h2>No projects match</h2>
              <p>Try another town, a different flat size, or all years.</p>
            </div>
          ) : (
            <>
              <div
                className="launch-tabs"
                role="tablist"
                aria-label="Launches"
                onKeyDown={(event) => {
                  const next = arrowNavigate(event, Math.max(tabKeys.indexOf(selectedLaunch?.key ?? ""), 0), tabKeys.length, '[role="tab"]');
                  if (next !== null) setActiveLaunch(tabKeys[next]);
                }}
              >
                {savedGroup && (
                  <button
                    type="button"
                    role="tab"
                    id={tabId(SAVED_KEY)}
                    aria-controls="launch-panel"
                    aria-selected={selectedLaunch?.key === SAVED_KEY}
                    tabIndex={selectedLaunch?.key === SAVED_KEY ? 0 : -1}
                    className="launch-tab launch-tab-saved"
                    onClick={() => setActiveLaunch(SAVED_KEY)}
                  >
                    <strong>
                      <Icon name="heart" />
                      Saved
                    </strong>
                    <span>
                      {savedGroup.projects.length} {savedGroup.projects.length === 1 ? "project" : "projects"}
                    </span>
                  </button>
                )}
                {launchGroups.map((group) => (
                  <LaunchTab
                    key={group.key}
                    group={group}
                    isActive={group.key === selectedLaunch?.key}
                    onClick={() => setActiveLaunch(group.key)}
                  />
                ))}
              </div>

              {selectedLaunch && (
                <div
                  className="launch-body"
                  key={selectedLaunch.key}
                  id="launch-panel"
                  role="tabpanel"
                  aria-labelledby={tabId(selectedLaunch.key)}
                >
                  <LaunchSummary
                    launch={selectedLaunch}
                    flatType={selectedFlatType}
                    budgetKnown={budgetKnown}
                    ceilingFor={ceilingFor}
                    fitOnly={fitOnly}
                    onToggleFitOnly={() => setFitOnly((current) => !current)}
                  />

                  <Priorities
                    scorePreset={scorePreset}
                    scoreWeights={scoreWeights}
                    fineTuneOpen={rankingOpen}
                    onFineTune={() => setRankingOpen((open) => !open)}
                    onScorePresetChange={onScorePresetChange}
                  />

                  {rankingOpen && (
                    <ScoreSettingsCard
                      scorePreset={scorePreset}
                      scoreWeights={scoreWeights}
                      onScorePresetChange={onScorePresetChange}
                      onScoreWeightsChange={onScoreWeightsChange}
                    />
                  )}

                  {comparedProjects.length >= 2 && (
                    <CompareTray
                      projects={comparedProjects}
                      selectedFlatType={selectedFlatType}
                      scores={projectScores}
                      onClear={() => setComparedProjectIds([])}
                    />
                  )}

                  <div className="project-grid">
                    {selectedLaunch.projects
                      .filter((project) => !fitOnly || !budgetKnown || fitsBudget(project, selectedFlatType, ceilingFor(project)))
                      .map((project, index) => (
                      <ProjectCard
                        key={project.id}
                        index={index}
                        project={project}
                        selectedFlatType={selectedFlatType}
                        budgetKnown={budgetKnown}
                        ceiling={ceilingFor(project)}
                        decisionScore={projectScores.get(project.id) ?? null}
                        rank={hasPriority ? index + 1 : null}
                        facts={projectFacts(project, scoreWeights, priceRanks.get(project.id) ?? null)}
                        isSelected={project.id === selectedProjectId}
                        isSaved={savedSet.has(project.id)}
                        isCompareSelected={activeComparedProjectIds.includes(project.id)}
                        isCompareDisabled={
                          activeComparedProjectIds.length >= MAX_COMPARE_PROJECTS &&
                          !activeComparedProjectIds.includes(project.id)
                        }
                        onOpen={() => setDetailProjectId(project.id)}
                        onToggleSaved={() => onToggleSaved(project.id)}
                        onToggleCompare={() => handleToggleCompareProject(project.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeComparedProjectIds.length === 1 && (
            <div className="dock" role="status">
              <p>Pick one more project to compare.</p>
              <button type="button" className="text-link" onClick={() => setComparedProjectIds([])}>
                Clear
              </button>
            </div>
          )}

          <ProjectSheet
            project={detailProject}
            selectedFlatType={selectedFlatType}
            budgetKnown={budgetKnown}
            ceiling={detailProject ? ceilingFor(detailProject) : ceiling}
            decisionScore={detailProject ? projectScores.get(detailProject.id) ?? null : null}
            isSelected={detailProject?.id === selectedProjectId}
            isSaved={detailProject ? savedSet.has(detailProject.id) : false}
            onClose={() => setDetailProjectId(null)}
            onFlatTypeChange={onFlatTypeChange}
            onToggleSaved={() => detailProject && onToggleSaved(detailProject.id)}
            onSelectProject={() => {
              if (!detailProject) return;
              setDetailProjectId(null);
              onSelectProject(detailProject.id);
            }}
          />
        </>
      )}
    </section>
  );
}

function LaunchTab({
  group,
  isActive,
  onClick,
}: {
  group: LaunchGroup;
  isActive: boolean;
  onClick: () => void;
}) {
  const status = getLaunchStatus(group.key);

  return (
    <button
      type="button"
      role="tab"
      id={tabId(group.key)}
      aria-controls="launch-panel"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      className="launch-tab"
      onClick={onClick}
    >
      <strong>
        {group.key}
        {status === "upcoming" || status === "this month" ? (
          <span className="launch-live">{status === "this month" ? "Open" : "Soon"}</span>
        ) : null}
      </strong>
      <span>
        {group.projects.length} {group.projects.length === 1 ? "project" : "projects"}
        {group.lowestPrice ? `, from ${currency(group.lowestPrice)}` : ""}
      </span>
    </button>
  );
}

function LaunchSummary({
  launch,
  flatType,
  budgetKnown,
  ceilingFor,
  fitOnly,
  onToggleFitOnly,
}: {
  launch: LaunchGroup;
  flatType: FlatType;
  budgetKnown: boolean;
  ceilingFor: (project: BtoProject) => number;
  fitOnly: boolean;
  onToggleFitOnly: () => void;
}) {
  const priced = launch.projects.filter((project) => getSelectedVariant(project, flatType));
  const fitting = priced.filter((project) => fitsBudget(project, flatType, ceilingFor(project)));
  const fittingPrices = fitting.map((project) => getSelectedVariant(project, flatType)?.basePrice ?? 0);
  const isSaved = launch.key === SAVED_KEY;
  const status = isSaved ? null : getLaunchStatus(launch.key);
  const context = [
    isSaved ? "Saved projects" : launch.key,
    `${formatNumber(launch.totalUnits)} flats`,
    status,
  ]
    .filter(Boolean)
    .join(" · ");

  let title: string;
  let detail: string;
  if (priced.length === 0) {
    title = `No ${flatTypeLabel(flatType)} prices listed yet`;
    detail = context;
  } else if (!budgetKnown) {
    title = `${priced.length} ${priced.length === 1 ? "project has" : "projects have"} ${flatTypeLabel(flatType)} prices`;
    detail = `${context} · from ${currency(launch.lowestPrice ?? 0)}`;
  } else if (fitting.length === 0) {
    title = `None of ${priced.length} fit your budget yet`;
    detail = `${context} · lowest ${currency(launch.lowestPrice ?? 0)}`;
  } else {
    title = `${fitting.length} of ${priced.length} ${priced.length === 1 ? "project fits" : "projects fit"} your budget`;
    detail = `${context} · from ${currency(Math.min(...fittingPrices))} to ${currency(Math.max(...fittingPrices))}`;
  }

  return (
    <div className="match-banner">
      <span className="match-icon" aria-hidden="true">
        <Icon name="sparkle" />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
      {budgetKnown && fitting.length > 0 && fitting.length < launch.projects.length && (
        <button type="button" className="btn btn-white btn-small" aria-pressed={fitOnly} onClick={onToggleFitOnly}>
          {fitOnly ? "Show all" : "Show only these"}
        </button>
      )}
    </div>
  );
}

function getLaunchStatus(launchKey: string) {
  const parsed = new Date(`1 ${launchKey}`);
  if (Number.isNaN(parsed.getTime())) return null;

  const today = new Date();
  const launchIndex = parsed.getFullYear() * 12 + parsed.getMonth();
  const todayIndex = today.getFullYear() * 12 + today.getMonth();

  if (launchIndex < todayIndex) return "applications closed";
  if (launchIndex === todayIndex) return "this month";
  return "upcoming";
}

function FitPill({ price, ceiling }: { price: number; ceiling: number }) {
  const over = Math.round(price - ceiling);
  return over > 0 ? (
    <span className="pill pill-caution">
      <Icon name="alert" />
      {currency(over)} over budget
    </span>
  ) : (
    <span className="pill pill-positive">
      <Icon name="check" />
      Fits your budget
    </span>
  );
}

function ProjectCard({
  index,
  project,
  selectedFlatType,
  budgetKnown,
  ceiling,
  rank,
  facts,
  isSelected,
  isSaved,
  isCompareSelected,
  isCompareDisabled,
  onOpen,
  onToggleSaved,
  onToggleCompare,
}: {
  index: number;
  project: BtoProject;
  selectedFlatType: FlatType;
  budgetKnown: boolean;
  ceiling: number;
  decisionScore: BtoDecisionScore | null;
  rank: number | null;
  facts: ProjectFact[];
  isSelected: boolean;
  isSaved: boolean;
  isCompareSelected: boolean;
  isCompareDisabled: boolean;
  onOpen: () => void;
  onToggleSaved: () => void;
  onToggleCompare: () => void;
}) {
  const variant = getSelectedVariant(project, selectedFlatType);

  return (
    <article
      className={isSelected ? "project-card is-selected" : "project-card"}
      style={{ ["--i" as string]: Math.min(index, 12) } as CSSProperties}
    >
      <ProjectMap project={project} className="project-map">
        {rank === 1 && <span className="rank-badge">Top match</span>}
        {rank !== null && rank > 1 && <span className="rank-badge rank-badge-quiet">#{rank}</span>}
        <TypeBadge type={project.btoType} />
      </ProjectMap>

      <div className="project-card-body">
        <div className="project-card-head">
          <div>
            <h3 className="project-name">
              <button type="button" className="stretched" onClick={onOpen}>
                {project.name}
              </button>
            </h3>
            <p className="project-meta">
              {project.location}
              {isSelected && <span className="in-plan">In your plan</span>}
            </p>
          </div>
          <SaveButton saved={isSaved} name={project.name} onToggle={onToggleSaved} />
        </div>

        {variant ? (
          <div className="project-price">
            <p>
              <strong>{currency(variant.basePrice)}</strong>
              <span className="size-chip">{flatTypeLabel(selectedFlatType)}</span>
            </p>
            {budgetKnown && <FitPill price={variant.basePrice} ceiling={ceiling} />}
          </div>
        ) : (
          <p className="project-price-missing">No {flatTypeLabel(selectedFlatType)} price yet</p>
        )}

        {facts.length > 0 && (
          <ul className="project-facts">
            {facts.map((fact) => (
              <li key={fact.key}>
                <Icon name={fact.icon} />
                {fact.text}
              </li>
            ))}
          </ul>
        )}

        <div className="project-foot">
          <label className={isCompareDisabled ? "compare-check is-disabled" : "compare-check"}>
            <input type="checkbox" checked={isCompareSelected} disabled={isCompareDisabled} onChange={onToggleCompare} />
            Compare
          </label>
          <button type="button" className="round-btn round-btn-small" aria-label={`Details for ${project.name}`} onClick={onOpen}>
            <Icon name="arrow" />
          </button>
        </div>
      </div>
    </article>
  );
}

// A street map of the site from OneMap (Singapore Land Authority). Projects without
// coordinates get a quiet placeholder so the grid keeps its rhythm.
function ProjectMap({
  project,
  className,
  large = false,
  children,
}: {
  project: BtoProject;
  className: string;
  large?: boolean;
  children?: ReactNode;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = locationMapUrl(project, 512, large ? 214 : 200);
  return (
    <div className={className}>
      {src && failedSrc !== src ? (
        <img
          src={src}
          alt={`Street map around ${project.name}`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span className="project-map-empty" aria-hidden="true">
          <Icon name="map" />
        </span>
      )}
      {children && <div className="project-map-tags">{children}</div>}
    </div>
  );
}

const PRESET_CHOICES: Array<{ value: BtoScorePreset; label: string; icon: "sparkle" | "money" | "metro" | "clock" }> = [
  { value: "balanced", label: "Best all-round", icon: "sparkle" },
  { value: "budget", label: "Lowest price", icon: "money" },
  { value: "commute", label: "Near the MRT", icon: "metro" },
  { value: "faster-top", label: "Soonest keys", icon: "clock" },
];

const SLIDER_TEXT: Record<keyof BtoScoreWeights, { label: string; hint: string }> = {
  affordability: { label: "Price", hint: "Lower prices, and prices within your budget, rank higher." },
  commute: { label: "Near the MRT", hint: "Shorter walk to the nearest MRT station." },
  centrality: { label: "Location", hint: "Closer to the city, mature towns and the waterfront." },
  wait: { label: "Keys date", hint: "Sooner keys, from HDB's completion date or announced waiting time." },
  supply: { label: "Project size", hint: "More flats in the project." },
};

const WEIGHT_WORDS: Record<keyof BtoScoreWeights, string> = {
  affordability: "price",
  commute: "MRT",
  centrality: "location",
  wait: "keys date",
  supply: "project size",
};

function Priorities({
  scorePreset,
  scoreWeights,
  fineTuneOpen,
  onFineTune,
  onScorePresetChange,
}: {
  scorePreset: BtoScorePreset;
  scoreWeights: BtoScoreWeights;
  fineTuneOpen: boolean;
  onFineTune: () => void;
  onScorePresetChange: (value: BtoScorePreset) => void;
}) {
  const index = PRESET_CHOICES.findIndex((choice) => choice.value === scorePreset);
  const order = (Object.keys(scoreWeights) as Array<keyof BtoScoreWeights>)
    .filter((key) => scoreWeights[key] > 0)
    .sort((a, b) => scoreWeights[b] - scoreWeights[a])
    .slice(0, 3)
    .map((key) => WEIGHT_WORDS[key]);
  return (
    <section className="priorities" aria-labelledby="priorities-title">
      <div className="priorities-head">
        <h2 id="priorities-title">What matters most to you</h2>
        <button type="button" className="text-link" aria-expanded={fineTuneOpen} aria-controls="ranking-panel" onClick={onFineTune}>
          <Icon name="filter" />
          {fineTuneOpen ? "Done" : "Fine-tune"}
        </button>
      </div>
      <div
        className="priority-choices"
        role="radiogroup"
        aria-labelledby="priorities-title"
        onKeyDown={(event) => {
          const next = arrowNavigate(event, Math.max(index, 0), PRESET_CHOICES.length, '[role="radio"]');
          if (next !== null) onScorePresetChange(PRESET_CHOICES[next].value);
        }}
      >
        {PRESET_CHOICES.map((choice, choiceIndex) => (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={scorePreset === choice.value}
            tabIndex={choiceIndex === (index < 0 ? 0 : index) ? 0 : -1}
            className="priority-choice"
            onClick={() => onScorePresetChange(choice.value)}
          >
            <Icon name={choice.icon} />
            {choice.label}
          </button>
        ))}
      </div>
      <p className="priorities-note">
        {order.length
          ? `${scorePreset === "custom" ? "Your own mix. " : ""}Best match first; each card leads with ${joinWords(order)}.`
          : "Pick what matters to rank the projects."}
      </p>
    </section>
  );
}

function joinWords(words: string[]) {
  return words.length < 2 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

function SaveButton({ saved, name, onToggle }: { saved: boolean; name: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="save-btn"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
      onClick={onToggle}
    >
      <Icon name="heart" />
    </button>
  );
}

function ProjectSheet({
  project,
  selectedFlatType,
  budgetKnown,
  ceiling,
  decisionScore,
  isSelected,
  isSaved,
  onClose,
  onFlatTypeChange,
  onToggleSaved,
  onSelectProject,
}: {
  project: BtoProject | null;
  selectedFlatType: FlatType;
  budgetKnown: boolean;
  ceiling: number;
  decisionScore: BtoDecisionScore | null;
  isSelected: boolean;
  isSaved: boolean;
  onClose: () => void;
  onFlatTypeChange: (value: FlatType) => void;
  onToggleSaved: () => void;
  onSelectProject: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (project && !dialog.open) dialog.showModal();
    if (!project && dialog.open) dialog.close();
  }, [project]);

  const variants = project
    ? [...project.flatVariants].sort(
        (a, b) =>
          FLAT_TYPE_OPTIONS.findIndex((option) => option.value === a.type) -
          FLAT_TYPE_OPTIONS.findIndex((option) => option.value === b.type)
      )
    : [];
  const typeNote = project?.btoType ? TYPE_NOTES[project.btoType.toLowerCase()] : undefined;
  const components = decisionScore?.components ?? [];
  const nearbyGroups = (["education", "recreation", "healthcare", "shopping"] as const)
    .map((group) => [group, project?.nearby?.[group] ?? []] as const)
    .filter(([, places]) => places.length > 0);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {project && (
        <div className="sheet-inner">
          <div className="sheet-head">
            <p className="project-meta">
              <TypeBadge type={project.btoType} />
              <span>
                {project.location}
                {project.launchMonth ? `, ${project.launchMonth} launch` : ""}
              </span>
            </p>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <Icon name="close" />
            </button>
          </div>

          <h2 id="sheet-title" className="sheet-title">
            {project.name}
          </h2>

          <ProjectMap project={project} className="sheet-map" large />

          {project.highlights && project.highlights.length > 0 && (
            <ul className="highlights">
              {project.highlights.slice(0, 4).map((highlight) => (
                <li key={highlight}>
                  <Icon name="check" />
                  {highlight}
                </li>
              ))}
            </ul>
          )}

          <section className="sheet-section">
            <h3>Prices by flat size</h3>
            {budgetKnown && (
              <p className="muted">
                For this project you could go up to <strong>{currency(ceiling)}</strong>, counting the CPF you build up
                before each payment is due.
              </p>
            )}
            {variants.length === 0 ? (
              <p className="muted">No prices listed for this project yet.</p>
            ) : (
              <ul className="price-list">
                {variants.map((variant) => (
                  <li key={variant.type}>
                    <button
                      type="button"
                      className="price-row"
                      aria-pressed={variant.type === selectedFlatType}
                      onClick={() => onFlatTypeChange(variant.type)}
                    >
                      <span className="price-row-size">{flatTypeLabel(variant.type)}</span>
                      <strong>{currency(variant.basePrice)}</strong>
                      {budgetKnown ? (
                        <FitPill price={variant.basePrice} ceiling={ceiling} />
                      ) : (
                        <span className="muted">estimated</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="sheet-section">
            <h3>The project</h3>
            <dl className="spec-grid spec-grid-wide">
              <div>
                <dt>Keys, estimated</dt>
                <dd>
                  {keysLabel(project)}
                  {keysAreEstimated(project) && waitLabel(project) && <span className="spec-sub">{waitLabel(project)}</span>}
                </dd>
              </div>
              <div>
                <dt>Nearest MRT</dt>
                <dd>{formatNearestMrt(project)}</dd>
              </div>
              <div>
                <dt>Flats</dt>
                <dd>
                  {formatNumber(project.totalUnits)}
                  {project.blocks ? (
                    <span className="spec-sub">
                      {project.blocks} blocks{project.highestFloor ? `, up to ${project.highestFloor} storeys` : ""}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt>Sizes</dt>
                <dd>{formatFlatSizes(project)}</dd>
              </div>
            </dl>
            {typeNote && <p className="sheet-note">{typeNote}</p>}
          </section>

          {nearbyGroups.length > 0 && (
            <section className="sheet-section">
              <h3>Nearby</h3>
              <dl className="nearby-list">
                {nearbyGroups.map(([group, places]) => (
                  <div key={group}>
                    <dt>{NEARBY_LABELS[group]}</dt>
                    <dd>{places.slice(0, 3).join(" · ")}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {components.length > 0 && (
            <section className="sheet-section">
              <h3>
                How it matches
                {decisionScore?.total != null && <span className="sheet-score">{decisionScore.total} of 100</span>}
              </h3>
              <ul className="match-list">
                {components.map((component) => (
                  <li key={component.key}>
                    <div>
                      <span>{component.label}</span>
                      <span className="muted">{component.reason}</span>
                    </div>
                    <span className="meter-track meter-track-wide" aria-hidden="true">
                      <span style={{ width: `${Math.max(4, Math.min(component.score, 100))}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="sheet-foot">
            <button type="button" className="btn btn-quiet" aria-pressed={isSaved} onClick={onToggleSaved}>
              <Icon name="heart" />
              {isSaved ? "Saved" : "Save"}
            </button>
            <button type="button" className="btn btn-primary btn-grow" onClick={onSelectProject}>
              {isSelected ? "Open in your plan" : "Plan this flat"}
              <Icon name="arrow" />
            </button>
          </div>
          {project.sourceUrl && (
            <a className="sheet-source" href={project.sourceUrl} target="_blank" rel="noreferrer">
              Full listing on {getBtoProjectSourceLabel(project)}
              <Icon name="external" />
            </a>
          )}
        </div>
      )}
    </dialog>
  );
}

function ScoreSettingsCard({
  scorePreset,
  scoreWeights,
  onScorePresetChange,
  onScoreWeightsChange,
}: {
  scorePreset: BtoScorePreset;
  scoreWeights: BtoScoreWeights;
  onScorePresetChange: (value: BtoScorePreset) => void;
  onScoreWeightsChange: (value: BtoScoreWeights) => void;
}) {
  const handleWeightChange = (key: (typeof SCORE_COMPONENT_ORDER)[number], value: number) => {
    if (scorePreset !== "custom") onScorePresetChange("custom");
    onScoreWeightsChange({
      ...scoreWeights,
      [key]: Math.min(Math.max(Math.round(value), 0), BTO_SCORE_IMPORTANCE_MAX),
    });
  };
  const hasActivePriority = Object.values(scoreWeights).some((weight) => weight > 0);

  return (
    <div className="card ranking" id="ranking-panel">
      <p className="muted">Set how much each one counts. Changing any of them makes your own mix.</p>
      {!hasActivePriority && (
        <p className="ranking-warning" role="status">
          Choose at least one thing that matters to rank projects.
        </p>
      )}
      <div className="ranking-sliders">
        {SCORE_COMPONENT_ORDER.map((key) => {
          const value = scoreWeights[key];
          const importance =
            BTO_SCORE_IMPORTANCE_LEVELS.find((level) => level.value === value) ?? BTO_SCORE_IMPORTANCE_LEVELS[0];
          const id = `weight-${key}`;
          return (
            <div key={key} className="ranking-slider">
              <label htmlFor={id}>
                <span>{SLIDER_TEXT[key].label}</span>
                <strong>{importance.label}</strong>
              </label>
              <p className="muted">{SLIDER_TEXT[key].hint}</p>
              <input
                id={id}
                type="range"
                min={0}
                max={BTO_SCORE_IMPORTANCE_MAX}
                step={1}
                value={value}
                aria-valuetext={importance.label}
                style={{ ["--fill" as string]: `${(value / BTO_SCORE_IMPORTANCE_MAX) * 100}%` }}
                onChange={(event) => handleWeightChange(key, Number(event.target.value))}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompareTray({
  projects,
  selectedFlatType,
  scores,
  onClear,
}: {
  projects: BtoProject[];
  selectedFlatType: FlatType;
  scores: Map<string, BtoDecisionScore>;
  onClear: () => void;
}) {
  const rows = buildCompareRows(projects, selectedFlatType, scores);

  return (
    <section className="card compare" aria-labelledby="compare-title">
      <div className="compare-head">
        <h2 id="compare-title">Side by side</h2>
        <p className="muted">
          {projects.length} of {MAX_COMPARE_PROJECTS} picked. The best value in each row is marked.
        </p>
        <button type="button" className="text-link" onClick={onClear}>
          Clear
        </button>
      </div>
      <div className="compare-scroll">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Detail</span>
              </th>
              {projects.map((project) => (
                <th key={project.id} scope="col">
                  <strong>{project.name}</strong>
                  <span>{project.location}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {row.values.map((cell) => {
                  const isBest = (row.bestProjectIds?.has(cell.projectId) ?? false) && projects.length > 1;
                  return (
                    <td key={cell.projectId} className={isBest ? "is-best" : undefined}>
                      {isBest && <Icon name="check" />}
                      {cell.value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TypeBadge({ type }: { type: string | undefined }) {
  if (!type) return null;
  const lower = type.toLowerCase();
  return <span className={`type-badge type-${lower}`}>{formatProjectType(type)}</span>;
}

// Listings say "To be announced" until HDB publishes a completion date.
function tabId(launchKey: string) {
  return `launch-tab-${launchKey.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function flatTypeLabel(type: FlatType) {
  return FLAT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

function fitsBudget(project: BtoProject, flatType: FlatType, ceiling: number) {
  const price = getSelectedVariant(project, flatType)?.basePrice;
  return price !== undefined && price <= ceiling;
}

function minOrNull(values: Array<number | null>) {
  const known = values.filter((value): value is number => value !== null);
  return known.length ? Math.min(...known) : null;
}

function buildCompareRows(
  projects: BtoProject[],
  selectedFlatType: FlatType,
  scores: Map<string, BtoDecisionScore>
): CompareRow[] {
  return [
    numericCompareRow({
      label: "Match",
      projects,
      direction: "high",
      getScore: (project) => scores.get(project.id)?.total ?? undefined,
      format: (_value, project) => formatDecisionScoreValue(scores.get(project.id) ?? null),
    }),
    numericCompareRow({
      label: `${flatTypeLabel(selectedFlatType)} price`,
      projects,
      direction: "low",
      getScore: (project) => getSelectedVariant(project, selectedFlatType)?.basePrice,
      format: (value, project) =>
        value === undefined
          ? "Not listed"
          : formatPrice(getSelectedVariant(project, selectedFlatType), selectedFlatType),
    }),
    numericCompareRow({
      label: "Price per sqm",
      projects,
      direction: "low",
      getScore: (project) => getSelectedVariant(project, selectedFlatType)?.pricePerSqm,
      format: (value) => (value === undefined ? "Not listed" : `${currency(value)}/sqm`),
    }),
    numericCompareRow({
      label: "Cash at signing",
      projects,
      direction: "low",
      getScore: (project) => {
        const variant = getSelectedVariant(project, selectedFlatType);
        return variant ? variant.basePrice * 0.1 : undefined;
      },
      format: (value) => (value === undefined ? "Not listed" : currency(value)),
    }),
    plainCompareRow({
      label: "Keys, estimated",
      projects,
      format: (project) => keysLabel(project),
    }),
    plainCompareRow({
      label: "Wait for keys",
      projects,
      format: (project) => waitLabel(project) ?? project.waitTimeMonths ?? "Not listed",
    }),
    numericCompareRow({
      label: "Flats",
      projects,
      direction: "high",
      getScore: (project) => project.totalUnits,
      format: (value) => (value === undefined ? "Not listed" : formatNumber(value)),
    }),
    plainCompareRow({
      label: "Category",
      projects,
      format: (project) => formatProjectType(project.btoType),
    }),
    numericCompareRow({
      label: "Nearest MRT",
      projects,
      direction: "low",
      getScore: (project) => project.nearestMrtDistanceMeters,
      format: (_value, project) => formatNearestMrt(project),
    }),
    plainCompareRow({
      label: "How central",
      projects,
      format: formatCentrality,
    }),
    plainCompareRow({
      label: "Area",
      projects,
      format: formatLocationContext,
    }),
    numericCompareRow({
      label: "Accessibility rating",
      projects,
      direction: "high",
      getScore: (project) => project.btohq?.ratings?.accessibility,
      format: (value) => formatRating(value),
    }),
    numericCompareRow({
      label: "Amenities rating",
      projects,
      direction: "high",
      getScore: (project) => project.btohq?.ratings?.amenities,
      format: (value) => formatRating(value),
    }),
    numericCompareRow({
      label: "Affordability rating",
      projects,
      direction: "high",
      getScore: (project) => project.btohq?.ratings?.affordability,
      format: (value) => formatRating(value),
    }),
    plainCompareRow({
      label: "Nearby amenities",
      projects,
      format: formatAmenities,
    }),
  ].filter(hasAnyListedValue);
}

function numericCompareRow({
  label,
  projects,
  direction,
  getScore,
  format,
}: {
  label: string;
  projects: BtoProject[];
  direction: "low" | "high";
  getScore: (project: BtoProject) => number | undefined;
  format: (value: number | undefined, project: BtoProject) => string;
}): CompareRow {
  const values = projects.map((project) => ({
    projectId: project.id,
    score: getScore(project),
    value: format(getScore(project), project),
  }));
  const scores = values
    .map((cell) => cell.score)
    .filter((score): score is number => Number.isFinite(score));
  const bestScore = scores.length
    ? direction === "low"
      ? Math.min(...scores)
      : Math.max(...scores)
    : undefined;

  return {
    label,
    values,
    bestProjectIds:
      bestScore === undefined
        ? undefined
        : new Set(
            values
              .filter((cell) => cell.score === bestScore)
              .map((cell) => cell.projectId)
          ),
  };
}

function plainCompareRow({
  label,
  projects,
  format,
}: {
  label: string;
  projects: BtoProject[];
  format: (project: BtoProject) => string;
}): CompareRow {
  return {
    label,
    values: projects.map((project) => ({
      projectId: project.id,
      value: format(project),
    })),
  };
}

function SourceCreditLinks() {
  return (
    <p className="credits" aria-label="BTO data credits">
      <span>Data from</span>
      {BTO_SOURCE_CREDITS.map((source) => (
        <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
          {source.label}
        </a>
      ))}
    </p>
  );
}

function groupProjectsByLaunch(
  projects: BtoProject[],
  flatType: FlatType,
  loanAmount: number,
  ehgGrant: number,
  totalAffordability: number,
  scorePreset: BtoScorePreset,
  scoreWeights: BtoScoreWeights
) {
  const groups = new Map<string, BtoProject[]>();

  projects.forEach((project) => {
    const key = project.launchMonth || "Launch date not listed";
    groups.set(key, [...(groups.get(key) ?? []), project]);
  });

  return Array.from(groups.entries())
    .map(([key, launchProjects]) => {
      const variants = launchProjects
        .map((project) => getSelectedVariant(project, flatType))
        .filter((variant): variant is BtoFlatVariant => Boolean(variant));
      const prices = variants.map((variant) => variant.basePrice);
      const totalUnits = launchProjects.reduce(
        (sum, project) => sum + (project.totalUnits ?? 0),
        0
      );
      const distanceProjectCount = launchProjects.filter((project) =>
        Number.isFinite(project.nearestMrtDistanceMeters)
      ).length;
      const ratingProjectCount = launchProjects.filter((project) =>
        Boolean(project.btohq?.ratings)
      ).length;

      const scores = scoreBtoProjects(
        launchProjects,
        { flatType, loanAmount, ehgGrant, totalAffordability },
        "buyer-fit",
        scorePreset,
        scoreWeights
      );

      return {
        key,
        projects: [...launchProjects].sort(sortProjectsForLaunch(flatType, scores)),
        totalUnits,
        lowestPrice: prices.length ? Math.min(...prices) : null,
        pricedProjectCount: variants.length,
        distanceProjectCount,
        ratingProjectCount,
      };
    })
    .sort((a, b) => getLaunchMonthSortValue(b.key) - getLaunchMonthSortValue(a.key));
}

function hasAnyListedValue(row: CompareRow) {
  return row.values.some(
    (cell) => cell.value !== "Not listed" && !cell.value.startsWith("No ")
  );
}

function sortProjectsForLaunch(
  flatType: FlatType,
  scores: Map<string, BtoDecisionScore>
) {
  return (a: BtoProject, b: BtoProject) => {
    const scoreA = scores.get(a.id)?.total;
    const scoreB = scores.get(b.id)?.total;

    if (typeof scoreB === "number" && typeof scoreA === "number") {
      return scoreB - scoreA;
    }
    if (typeof scoreB === "number") return 1;
    if (typeof scoreA === "number") return -1;

    const variantA = getSelectedVariant(a, flatType);
    const variantB = getSelectedVariant(b, flatType);

    if (variantA && variantB && variantA.basePrice !== variantB.basePrice) {
      return variantA.basePrice - variantB.basePrice;
    }
    if (variantA && !variantB) return -1;
    if (!variantA && variantB) return 1;

    const townA = (a.location || a.district || "").toLowerCase();
    const townB = (b.location || b.district || "").toLowerCase();
    if (townA !== townB) return townA.localeCompare(townB);
    return a.name.localeCompare(b.name);
  };
}

function formatPrice(variant: BtoFlatVariant | undefined, flatType: FlatType) {
  if (!variant) return `No ${flatType} price`;
  const pricePerSqm = variant.pricePerSqm
    ? variant.pricePerSqm
    : variant.floorAreaSqm
      ? variant.basePrice / variant.floorAreaSqm
      : null;
  const area = variant.floorAreaSqm && pricePerSqm
    ? `, ${variant.floorAreaSqm} sqm, ${currency(pricePerSqm)}/sqm`
    : "";
  return `${currency(variant.basePrice)}${area}`;
}

function getSelectedVariant(project: BtoProject, flatType: FlatType) {
  return project.flatVariants.find((variant) => variant.type === flatType);
}

function formatFlatSizes(project: BtoProject) {
  if (project.flatVariants.length > 0) {
    return project.flatVariants.map((variant) => variant.type).join(", ");
  }

  if (project.availableFlatTypes?.length) {
    return project.availableFlatTypes.join(", ");
  }

  return project.unitTypes ?? "Not listed";
}

function formatProjectType(type: string | undefined) {
  if (!type) return "Not listed";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatNearestMrt(project: BtoProject) {
  const station = project.nearestMrt ?? "Not listed";
  if (!project.nearestMrtDistanceMeters) return station;

  return `${station}, ${formatDistance(project.nearestMrtDistanceMeters)} est.`;
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters >= 1000) return `${(distanceMeters / 1000).toFixed(1)} km`;
  return `${Math.round(distanceMeters / 10) * 10} m`;
}

function formatRating(value: number | undefined) {
  return Number.isFinite(value) ? `${value}/5` : "Not listed";
}

function formatAmenities(project: BtoProject) {
  const amenities = Object.values(project.btohq?.nearbyAmenities ?? {})
    .filter(Boolean)
    .slice(0, 3);

  return amenities.length ? amenities.join(", ") : "Not listed";
}

function formatCentrality(project: BtoProject) {
  const score = project.locationSignals?.centralityScore;
  const label = project.locationSignals?.centralityLabel;
  if (!Number.isFinite(score)) return label ?? "Not listed";
  return label ? `${score}/100, ${label}` : `${score}/100`;
}

function formatLocationContext(project: BtoProject) {
  const tags = project.locationSignals?.contextTags ?? [];
  if (tags.length) return tags.join(", ");
  return project.locationSignals?.centralityLabel ?? "Not listed";
}

function formatDecisionScoreValue(score: BtoDecisionScore | null) {
  if (!score || score.total === null) return "Not enough data";
  return `${score.total} of 100`;
}

function formatNumber(value: number | undefined) {
  return typeof value === "number" ? value.toLocaleString("en-SG") : "Not listed";
}
