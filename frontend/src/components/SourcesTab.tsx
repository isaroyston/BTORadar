import { Icon, PageHeader, type IconName } from "./DashboardUi";

type SourceLink = {
  label: string;
  href: string;
  description: string;
};

const dataSources: SourceLink[] = [
  {
    label: "RecordBTO",
    href: "https://recordbto.com",
    description: "Community-curated BTO launch records and prices.",
  },
  {
    label: "BTOHQ",
    href: "https://btohq.com",
    description: "BTO launch data, ratings and nearby amenities.",
  },
  {
    label: "data.gov.sg",
    href: "https://data.gov.sg",
    description: "Singapore's open data portal, used for MRT station locations.",
  },
];

const policyDocuments: SourceLink[] = [
  {
    label: "CPF allocation rates, 2026",
    href: `/data/policies/${encodeURIComponent("cpf_allocation_2026.pdf")}`,
    description: "How much of each salary goes into the CPF Ordinary Account, by age.",
  },
  {
    label: "Enhanced CPF Housing Grant amounts",
    href: `/data/policies/${encodeURIComponent("EHG amount Couples and Families Aug 2024.pdf")}`,
    description: "Grant amounts for couples and families, by household income.",
  },
];

export function SourcesTab() {
  return (
    <section className="screen">
      <PageHeader
        title="Sources"
        subtitle="Project data is scraped from public listings and refreshed by hand. Policy figures come from the documents below."
      />

      <div className="sources">
        <SourceList title="Project data" icon="external" links={dataSources} />
        <SourceList title="Policy documents" icon="document" links={policyDocuments} />
      </div>

      <div className="callout">
        <p>
          Everything here is an estimate. HDB's HFE letter and your bank's in-principle approval are the final word on
          what you can borrow.
        </p>
      </div>
    </section>
  );
}

function SourceList({ title, icon, links }: { title: string; icon: IconName; links: SourceLink[] }) {
  return (
    <section className="card">
      <h2 className="card-title">{title}</h2>
      <ul className="link-list">
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} target="_blank" rel="noreferrer">
              <span className="link-icon" aria-hidden="true">
                <Icon name={icon} />
              </span>
              <span>
                <strong>{link.label}</strong>
                <span className="muted">{link.description}</span>
              </span>
              <Icon name="chevron" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
