// Feature copy. Names follow SANYTA_BRAND.md §A7 (D3); the headlines are
// brand lines (§A4, Appendix) or allowed wordings (§A8).
// Titles mark the one highlighted phrase with [brackets].
// Health lines name their source; growth says when to ask the pediatrician.

import { counts } from './stats';

// A phone shows a screenshot (`screen`) or a screen recording (`clip`, from
// clips.generated.json); `overlay` draws on top of the screenshot.
export type Shot = { screen?: string; clip?: string; overlay?: 'growth-line'; alt: string };

export type FeatureSection = {
  id: string;
  name?: string; // D3 feature name, shown small above the headline
  title: string;
  body: string[];
  screens?: Shot[]; // one phone, or two overlapped
  card?: 'first-aid'; // stands in for a phone where the app has no screen to show
  link?: { href: string; label: string };
};

// დღიური leads the features; its title already carries the name.
export const diary: FeatureSection = {
  id: 'diary',
  title: 'კვება, ძილი, საფენი — [ერთ დღიურში]',
  body: [
    'ღამის 3 საათია და ვეღარ იხსენებ, ბოლოს როდის ჭამა? ჩართე ქრონომეტრი ერთი შეხებით და ჩაინიშნე კვება, ძილი, ტირილი და საფენის ცვლა.',
  ],
  screens: [
    { screen: 'diary', alt: 'დღიურის ეკრანი: დღის შეჯამება და ბოლო ჩანაწერები' },
    { screen: 'diary-history', alt: 'დღიურის ისტორია: კვების გრაფიკი კვირის მიხედვით' },
  ],
};

export const sleepSounds = {
  id: 'sounds',
  title: 'იავნანა, წვიმა, ზღვა — [ძილის ხმები]',
  body: [
    '4 იავნანა და 5 თეთრი ხმაური — ბრამსიდან ქართულ იავნანამდე, საშვილოსნოს ხმიდან ბუხრის ტკაცუნამდე.',
    'ძილის ტაიმერი ხმას თავად გამორთავს. უკრავს გამორთულ ეკრანზეც ან სხვა აპში ყოფნისას.',
  ],
};

// The rest, in page order after ძილის ხმები.
export const featureSections: FeatureSection[] = [
  {
    id: 'development',
    name: 'განვითარება',
    title: 'რა ხდება [ამ ასაკში]?',
    body: [
      `${counts.articles} სტატია და ${counts.activities} აქტივობა ასაკის მიხედვით — UNICEF-ის მასალებზე დაყრდნობით.`,
      'ყოველდღე ახალი აქტივობა, სახლში არსებული ნივთებით.',
    ],
    screens: [{ clip: 'development', alt: 'განვითარების ეკრანი: სტატიების სია და ერთი სტატიის გახსნა' }],
  },
  {
    id: 'feeding',
    name: 'კვება და რეცეპტები',
    title: 'პირველი კოვზიდან [საოჯახო სადილამდე]',
    body: [
      `${counts.recipes} რეცეპტი 6 თვიდან 3 წლამდე, NHS-ის რეკომენდაციებით — ინგრედიენტები და ნაბიჯები, ასაკის მიხედვით.`,
      'მყარი საკვებზე გადასვლის რჩევები CDC-ის რეკომენდაციებს ეყრდნობა.',
    ],
    screens: [{ clip: 'recipes', alt: 'რეცეპტების ეკრანი: რეცეპტის გახსნა — ინგრედიენტები და მომზადება' }],
  },
  {
    id: 'growth',
    name: 'ზრდის გრაფიკი',
    title: '[საერთაშორისო სტანდარტებზე] დაფუძნებული ზრდის პერცენტილი',
    body: [
      'ჩაწერე სიმაღლე და წონა: გრაფიკი WHO-ს ზრდის სტანდარტებთან ერთად გიჩვენებს, როგორ მიჰყვება ბავშვი განვითარების მრუდს. კითხვა თუ გაგიჩნდა — პედიატრს ჰკითხე.',
    ],
    screens: [{ screen: 'growth', overlay: 'growth-line', alt: 'ზრდის გრაფიკი: ბავშვის წონის მრუდი WHO-ს პერცენტილებთან ერთად' }],
    link: { href: '/growth-chart.html', label: 'გაიგე მეტი ზრდის გრაფიკის შესახებ' },
  },
  {
    id: 'vaccines',
    name: 'ვაქცინაცია და კალენდარი',
    title: 'აცრა აღარ [გამოგრჩება]',
    body: [
      'NCDC-ის ოფიციალური კალენდარი, ბავშვის ასაკის მიხედვით. Sanyta შეგახსენებს, როდის რომელი აცრაა.',
      'ექიმთან ვიზიტები და შეხვედრები კალენდარში ჩაინიშნე — შეხსენებებით.',
    ],
    screens: [
      { clip: 'vaccines', alt: 'ვაქცინაციის ეკრანი: NCDC-ის კალენდარი, აცრის მონიშვნა გაკეთებულად' },
      { clip: 'calendar', alt: 'კალენდარი: ექიმთან ვიზიტის დროის შეცვლა' },
    ],
    link: { href: '/vaccines.html', label: 'გაიგე მეტი ვაქცინაციის კალენდრის შესახებ' },
  },
  {
    id: 'moments',
    name: 'მომენტები',
    title: 'პირველი ღიმილი გახსოვს. [თარიღი — არა.]',
    body: [
      `${counts.moments} პატარა მომენტი, პირველი კბილიდან პირველ ნაბიჯამდე — ფოტოთი, თარიღითა და შენიშვნით.`,
      'ფოტოები რჩება შენს ტელეფონში.',
    ],
    screens: [{ clip: 'moments', alt: 'მომენტების ეკრანი: ახალი ფოტოს დამატება ალბომში' }],
  },
  {
    // A partner's course, not an app feature: say so plainly (§A8 names
    // partners as partners). No discount % or code here: V4 is still open,
    // and the code lives in the app.
    id: 'first-aid',
    name: 'პარტნიორის შეთავაზება',
    title: 'იცი, რა უნდა გააკეთო [პირველ 10 წამში]?',
    body: [
      'ბავშვთა პირველადი დახმარების ტრენინგი Sanyta-ს ფუნქცია არ არის — მას ჩვენი პარტნიორი, First Aid SkillHub ატარებს. ეს პრაქტიკული საოჯახო მოდულია, შენს სახლში.',
      'Sanyta-ს მომხმარებლებს ტრენინგზე ფასდაკლება აქვთ — პრომო-კოდს აპში იპოვი.',
    ],
    card: 'first-aid',
    link: { href: 'https://firstaidskillhub.ge', label: 'First Aid SkillHub' },
  },
];

// From the app's first_aid_copy.dart (FaCopy.emergencyChips).
export const firstAidTopics = [
  'სუნთქვა და გადაცდენა',
  'კრუნჩხვა',
  'ცხელება',
  'კრუპი',
  'სისხლდენა',
  'ალერგიული რეაქცია',
  'თავის ტრავმა',
  'სიმაღლიდან ვარდნა',
  'დამწვრობა',
];
