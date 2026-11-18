import { TABS } from "../constants";
import type { TabKey } from "../types";
import { Icon, type IconName } from "./DashboardUi";

type NavigationProps = {
  activeTab: TabKey;
  doneTabs: Set<TabKey>;
  onSelectTab: (tab: TabKey) => void;
};

const tabIcons: Record<TabKey, IconName> = {
  bto: "building",
  plan: "clipboard",
  overview: "home",
  sources: "document",
};

// Three places do the work; Sources sits apart, and only in the sidebar.
const MAIN: TabKey[] = ["overview", "bto", "plan"];

export function Navigation({ activeTab, doneTabs, onSelectTab }: NavigationProps) {
  const main = TABS.filter((tab) => MAIN.includes(tab.id));
  const other = TABS.filter((tab) => !MAIN.includes(tab.id));

  const item = (tab: (typeof TABS)[number]) => {
    const done = doneTabs.has(tab.id);
    return (
      <button
        key={tab.id}
        type="button"
        className="side-item"
        aria-current={activeTab === tab.id ? "page" : undefined}
        onClick={() => onSelectTab(tab.id)}
      >
        <span className="side-icon" aria-hidden="true">
          <Icon name={tabIcons[tab.id]} />
        </span>
        <span>{tab.label}</span>
        {done && (
          <span className="side-done" title="Done">
            <Icon name="check" />
            <span className="sr-only">(done)</span>
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      <nav className="side-nav" aria-label="Sections">
        <Brand />
        <div className="side-group">{main.map(item)}</div>
        <div className="side-group side-group-quiet">{other.map(item)}</div>
      </nav>

      <header className="top-bar">
        <Brand />
      </header>

      <nav className="tab-bar" aria-label="Sections">
        {main.map((tab) => (
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
        {"BTO "}
        <br />
        Radar
      </span>
    </div>
  );
}
