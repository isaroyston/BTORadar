import { TABS } from "../constants";
import type { TabKey } from "../types";
import { Icon, type IconName } from "./DashboardUi";

type NavigationProps = {
  activeTab: TabKey;
  doneTabs: Set<TabKey>;
  onSelectTab: (tab: TabKey) => void;
};

const tabIcons: Record<TabKey, IconName> = {
  budget: "wallet",
  bto: "building",
  plan: "clipboard",
  overview: "home",
  sources: "document",
};

// The first three sections are the journey, in order; the rest are places to check in.
const JOURNEY: TabKey[] = ["budget", "bto", "plan"];

export function Navigation({ activeTab, doneTabs, onSelectTab }: NavigationProps) {
  const journey = TABS.filter((tab) => JOURNEY.includes(tab.id));
  const other = TABS.filter((tab) => !JOURNEY.includes(tab.id));

  return (
    <>
      <nav className="side-nav" aria-label="Sections">
        <Brand />
        <ol className="side-steps">
          {journey.map((tab, index) => {
            const done = doneTabs.has(tab.id);
            return (
              <li key={tab.id}>
                <button
                  type="button"
                  className="side-item"
                  aria-current={activeTab === tab.id ? "page" : undefined}
                  onClick={() => onSelectTab(tab.id)}
                >
                  <span className={done ? "side-step side-step-done" : "side-step"} aria-hidden="true">
                    {done ? <Icon name="check" /> : index + 1}
                  </span>
                  <span>{tab.label}</span>
                  {done && <span className="sr-only">(done)</span>}
                </button>
              </li>
            );
          })}
        </ol>
        <div className="side-other">
          {other.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className="side-item side-item-quiet"
              aria-current={activeTab === tab.id ? "page" : undefined}
              onClick={() => onSelectTab(tab.id)}
            >
              <span className="side-icon" aria-hidden="true">
                <Icon name={tabIcons[tab.id]} />
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <p className="side-note">Estimates only. HDB's HFE letter is the final word.</p>
      </nav>

      <header className="top-bar">
        <Brand />
      </header>

      <nav className="tab-bar" aria-label="Sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="tab-bar-item"
            aria-current={activeTab === tab.id ? "page" : undefined}
            onClick={() => onSelectTab(tab.id)}
          >
            <span className="tab-bar-icon" aria-hidden="true">
              <Icon name={tabIcons[tab.id]} />
              {doneTabs.has(tab.id) && <span className="tab-bar-dot" />}
            </span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <span />
      </span>
      <span className="brand-name">
        BTO <strong>Radar</strong>
      </span>
    </div>
  );
}
