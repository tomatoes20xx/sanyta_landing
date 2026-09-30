// The five sources, in the D5 order (UNICEF, NHS, CDC, WHO, NCDC).
// Mirrors lib/core/constants/content_sources.dart in the app; attribute each
// source only to its own domain (SANYTA_BRAND.md §A7).

export type Source = {
  id: string;
  acronym: string;
  name: string; // full Georgian name
  domain: string;
  tone: 'dev' | 'rec' | 'act' | 'cal' | 'peach';
  url: string;
};

export const sources: Source[] = [
  {
    id: 'unicef',
    acronym: 'UNICEF',
    name: 'გაეროს ბავშვთა ფონდი',
    domain: 'განვითარების სტატიები · თამაშები და აქტივობები',
    tone: 'dev',
    url: 'https://www.unicef.org/parenting/',
  },
  {
    id: 'nhs',
    acronym: 'NHS',
    name: 'ბრიტანეთის ჯანდაცვის ეროვნული სამსახური',
    domain: 'რეცეპტები და კვების რჩევები',
    tone: 'rec',
    url: 'https://www.nhs.uk/best-start-in-life/baby/recipes-and-meal-ideas/',
  },
  {
    id: 'cdc',
    acronym: 'CDC',
    name: 'აშშ-ის დაავადებათა კონტროლისა და პრევენციის ცენტრი',
    domain: 'მყარი საკვების დაწყება',
    tone: 'act',
    url: 'https://www.cdc.gov/infant-toddler-nutrition/foods-and-drinks/when-what-and-how-to-introduce-solid-foods.html',
  },
  {
    id: 'who',
    acronym: 'WHO',
    name: 'მსოფლიო ჯანდაცვის ორგანიზაცია',
    domain: 'ზრდის გრაფიკი და პერცენტილები',
    tone: 'cal',
    url: 'https://www.who.int/tools/child-growth-standards',
  },
  {
    id: 'ncdc',
    acronym: 'NCDC',
    name: 'დაავადებათა კონტროლისა და საზოგადოებრივი ჯანმრთელობის ეროვნული ცენტრი',
    domain: 'ვაქცინაციის კალენდარი',
    tone: 'peach',
    url: 'https://www.ncdc.ge/',
  },
];

// Shown under the source list and in the FAQ. Sanyta has no relationship
// with these organisations; it only uses what they publish openly.
export const sourcesDisclaimer =
  'Sanyta დამოუკიდებელი აპლიკაციაა და არ არის დაკავშირებული UNICEF-თან, NHS-თან, CDC-თან, WHO-სთან ან NCDC-თან — არც მათ მიერაა მხარდაჭერილი. ვიყენებთ მხოლოდ მათ მიერ საჯაროდ გამოქვეყნებულ ინფორმაციას; ორგანიზაციების სახელები მითითებულია მხოლოდ წყაროს აღსანიშნავად.';
