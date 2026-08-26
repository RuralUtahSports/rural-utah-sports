// Team single-game statistical records builder.
// Deseret News game-stat extraction. Category display priority:
// Total Offense -> Passing -> Rushing.

export const TEAM_RECORD_CATEGORY_ORDER = [
  'totalOffenseYards',
  'passingYards',
  'rushingYards',
  'firstDowns',
  'passingTouchdowns',
  'rushingTouchdowns',
  'sacks',
  'tacklesForLoss',
  'interceptions',
  'fumbleRecoveries',
  'takeaways'
];

export const TEAM_RECORD_CATEGORIES = {
  totalOffenseYards: { label: 'Total Offense', unit: 'yards' },
  passingYards: { label: 'Passing Yards', unit: 'yards' },
  rushingYards: { label: 'Rushing Yards', unit: 'yards' },
  firstDowns: { label: 'First Downs', unit: 'first downs' },
  passingTouchdowns: { label: 'Passing Touchdowns', unit: 'TD' },
  rushingTouchdowns: { label: 'Rushing Touchdowns', unit: 'TD' },
  sacks: { label: 'Sacks', unit: 'sacks' },
  tacklesForLoss: { label: 'Tackles for Loss', unit: 'TFL' },
  interceptions: { label: 'Interceptions', unit: 'INT' },
  fumbleRecoveries: { label: 'Fumble Recoveries', unit: 'FR' },
  takeaways: { label: 'Takeaways', unit: 'takeaways' }
};

// This module is intentionally the first isolated step of the team-record pipeline.
// The extractor will reuse the existing player single-game records game discovery,
// canonical team aliases, game IDs, dates/opponents and deduplication before publishing
// generated data under team-single-game-records/.
