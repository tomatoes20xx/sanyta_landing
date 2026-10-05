// Structured data (schema.org JSON-LD) for search engines, rendered by
// Base.astro from a page's `schema` prop. Every fact comes from site.ts, so
// the markup never says more than the page does. No aggregateRating: there
// are no ratings to show yet, and the site carries no social proof.
import { founder, site } from '../data/site';

const home = `${site.url}/`;
const orgId = `${site.url}/#organization`;
const personId = `${site.url}/author.html#person`;

// site.prices holds display strings ('$3.99'); schema.org wants the number
const usd = (price: string) => price.replace('$', '');

const subscription = (name: string, price: string, period: 'P1M' | 'P1Y') => ({
  '@type': 'Offer',
  name,
  price: usd(price),
  priceCurrency: 'USD',
  priceSpecification: {
    '@type': 'UnitPriceSpecification',
    price: usd(price),
    priceCurrency: 'USD',
    billingDuration: period,
  },
});

export const organization = {
  '@type': 'Organization',
  '@id': orgId,
  name: site.name,
  url: home,
  // 180 px: Google wants a logo of at least 112 px (brand/icon.png is 96)
  logo: `${site.url}/apple-touch-icon.png`,
  email: site.email,
  founder: { '@id': personId },
  sameAs: [site.appStoreUrl],
};

export const website = {
  '@type': 'WebSite',
  '@id': `${site.url}/#website`,
  name: site.name,
  url: home,
  inLanguage: 'ka',
  publisher: { '@id': orgId },
};

export const mobileApp = {
  '@type': 'MobileApplication',
  '@id': `${site.url}/#app`,
  name: site.name,
  description: site.description,
  url: home,
  image: `${site.url}/apple-touch-icon.png`,
  operatingSystem: 'iOS',
  applicationCategory: 'HealthApplication',
  inLanguage: 'ka',
  installUrl: site.appStoreUrl,
  publisher: { '@id': orgId },
  offers: [
    subscription('ყოველთვიური გამოწერა', site.prices.monthly, 'P1M'),
    subscription('ყოველწლიური გამოწერა', site.prices.yearly, 'P1Y'),
  ],
};

export const person = {
  '@type': 'Person',
  '@id': personId,
  name: founder.name,
  jobTitle: founder.role,
  url: `${site.url}/author.html`,
  worksFor: { '@id': orgId },
};

/** One JSON-LD document for the page, safe to inline in a <script>. */
export function jsonLd(nodes: object[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(/</g, '\\u003c');
}
