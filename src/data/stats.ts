// Content counts, not usage counts — the app has no analytics.
// Counted from the app on 2026-09-29; re-check before a release:
//   recipes/activities/articles: length of assets/data/<name>.json
//   moments: MilestoneDef entries in lib/core/data/milestone_catalog.dart
//   sources: lib/core/constants/content_sources.dart (5 organisations)

export const counts = {
  sources: 5,
  recipes: 97,
  activities: 41,
  articles: 29,
  moments: 58,
  sounds: 9,
} as const;
