// Site-wide facts and copy. Georgian copy follows SANYTA_BRAND.md
// (Part A, and §B4 W1–W11 for this site). Check new lines against §A10.

export const site = {
  name: 'Sanyta',
  url: 'https://sanyta.ge',
  // Region-neutral App Store link: opens in the visitor's own storefront.
  appStoreUrl: 'https://apps.apple.com/app/id6780416078',
  // TODO(Toma): confirm the spelling, or switch to an @sanyta.ge address.
  email: 'tomakatcheishvili@gmail.com',

  // §A1 tagline system
  descriptor: 'Sanyta — ბავშვის განვითარება · პირველი 3 წელი', // <title> (W2)
  positioning: 'სანდო თანამგზავრი ბავშვის პირველი 3 წლისთვის',
  signOff: 'ჯანსაღი ბავშვი. მშვიდი მშობელი.',
  description:
    'Sanyta — სანდო თანამგზავრი ბავშვის პირველი 3 წლისთვის. განვითარება, კვება, ზრდა, აცრები და დღიური ერთ ადგილას — ყოველი რჩევა სანდო წყაროებიდან.',

  // Live App Store prices (Toma, 2026-09-29 — brand guide V5).
  prices: { monthly: '$3.99', yearly: '$34.99' },
} as const;

// §A8: every „უფასო" on the website carries the subscription disclosure.
export const trialLine = `პირველი კვირა უფასოა, შემდეგ — გამოწერა: ${site.prices.monthly}/თვე ან ${site.prices.yearly}/წელი.`;

// Links use the .html paths so they resolve on any static host,
// whether or not it serves "pretty" URLs.
export const nav = [
  { href: '/', label: 'მთავარი' },
  { href: '/about.html', label: 'ჩვენ შესახებ' },
  { href: '/#faq', label: 'კითხვები' },
] as const;
