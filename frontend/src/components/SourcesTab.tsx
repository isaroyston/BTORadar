import { Icon, PageHeader } from "./DashboardUi";

type SourceLink = {
  label: string;
  href: string;
  description: string;
};

const dataSources: SourceLink[] = [
  {
    label: "RecordBTO",
    href: "https://recordbto.com",
    description: "Community-curated BTO launch records, prices, waiting times, highlights and nearby places.",
  },
  {
    label: "BTOHQ",
    href: "https://btohq.com",
    description: "BTO launch data, ratings and nearby amenities.",
  },
  {
    label: "data.gov.sg",
    href: "https://data.gov.sg",
    description: "Singapore's open data portal: MRT station locations, and HDB resale prices for the last 12 months (median by town and flat size).",
  },


  {
    label: "OneMap",
    href: "https://www.onemap.gov.sg",
    description: "Street maps of each project site, from the Singapore Land Authority.",
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
  {
    label: "When housing grants are paid",
    href: "https://mnd.gov.sg/newsroom/speeches/view/written-answer-by-ministry-of-national-development-on-disbursement-of-housing-grants-through-home-buyers-cpf-accounts",
    description: "HDB credits the grant to CPF before you sign the Agreement for Lease, so it can pay that downpayment.",
  },
  {
    label: "Income ceilings from 24 August 2026",
    href: "https://propertynoob.com/blog/2026/08/28/hdb-income-ceiling-finally-rises",
    description: "As reported after National Day Rally 2026 (not yet checked against HDB's own page): S$16,000 for families and HDB loans (from S$14,000), S$8,000 for singles (from S$7,000), for HFE applications from 24 Aug 2026. Grant ceilings unchanged.",
  },


  {
    label: "Signing the Agreement for Lease",
    href: "https://www.hdb.gov.sg/residential/buying-a-flat/buying-procedure-for-new-flats/sign-agreement-for-lease",
    description: "Signing happens within 9 months of booking; BTO Radar assumes 4, so CPF by then isn't overstated.",
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
        <SourceList title="Project data" links={dataSources} />
        <SourceList title="Policy documents" links={policyDocuments} />
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

function SourceList({ title, links }: { title: string; links: SourceLink[] }) {
  return (
    <section className="card">
      <h2 className="card-title">{title}</h2>
      <ul className="link-list">
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} target="_blank" rel="noreferrer">
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
