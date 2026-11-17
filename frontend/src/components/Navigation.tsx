import { useState } from "react";
import { TABS } from "../constants";
import type { TabKey } from "../types";
import { applyTheme, loadTheme, NEXT_THEME, THEME_LABEL, type ThemeChoice } from "../utils/theme";
import { Icon, type IconName } from "./DashboardUi";

function ThemeSwitch() {
  const [theme, setTheme] = useState<ThemeChoice>(loadTheme);
  return (
    <button
      type="button"
      className="theme-switch"
      aria-label={`${THEME_LABEL[theme]}. Switch to ${NEXT_THEME[theme]}.`}
      onClick={() => {
        const next = NEXT_THEME[theme];
        applyTheme(next);
        setTheme(next);
      }}
    >
      <Icon name={theme === "dark" ? "bulb" : theme === "light" ? "sparkle" : "settings"} />
      {THEME_LABEL[theme]}
    </button>
  );
}

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
        <div className="side-group">
          {other.filter((tab) => tab.id === "overview").map(item)}
          {journey.map(item)}
        </div>
        <div className="side-group side-group-quiet">{other.filter((tab) => tab.id !== "overview").map(item)}</div>
        <div className="side-foot">
          <p>Estimates, not advice</p>
          <p className="side-note">Worked out from HDB and CPF rules. Your HFE letter is the final word.</p>
          <ThemeSwitch />
        </div>
      </nav>

      <header className="top-bar">
        <Brand />
        <ThemeSwitch />
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
        {"BTO "}
        <br />
        Radar
      </span>
    </div>
  );
}
