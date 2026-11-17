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
    label: "HDB application rates, Nov 2026",
    href: "https://www.99.co/singapore/insider/november-2026-bto-application-rates/",
    description: "HDB's applicants per flat for each project and flat size at 12.10pm on 10 Nov 2026, during the window, as reported by 99.co. Used for the rough ballot odds.",
  },
  {
    label: "Town council S&CC rates",
    href: "https://www.ectc.org.sg/OurServices/SccCharges",
    description: "Normal monthly service and conservancy charges from East Coast, Tanjong Pagar and Punggol town councils, including GST.",
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
    label: "Ballot chances",
    href: "https://www.hdb.gov.sg/cs/infoweb/residential/buying-a-flat/buying-procedure-for-new-flats/application/priority-schemes",
    description: "First-timer families get 2 chances (3 for FT(PMC)); one more per Standard application after two unsuccessful ones, up to 4 (5). None extra for Plus or Prime.",
  },
  {
    label: "Owner-occupier property tax, 2025",
    href: "https://www.iras.gov.sg/taxes/property-tax/property-owners/property-tax-rates",
    description: "0% on the first S$12,000 of annual value, 4% on the next S$28,000, and so on.",
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
