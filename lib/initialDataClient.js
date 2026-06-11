// Client-safe module (no server deps) holding the original season data,
// used for first-boot seeding and the admin "Reset to original data" button.
// Legacy rounds carry sequential May 2026 dates (assigned retroactively;
// exact play dates weren't recorded).

const LEGACY_PLAYERS = {
  "Eric":    [null, 920, 882, 878, 876, 987, 911, 819, 958],
  "Elliott": [917, 849, 927, 841, 879, 937, null, null, 944],
  "Drew":    [null, null, null, null, 934, 830, 896, null, 934],
  "Jordan":  [853, 845, 863, 876, 898, null, 771, 908, 929],
  "Jack":    [null, null, null, null, 750, null, 826, null, 889],
  "Colin":   [831, 618, 771, 689, 694, null, null, 814, 813],
  "Connor":  [null, 725, 854, 648, 872, 418, 688, 770, 809],
  "Liam":    [null, null, 657, 630, 785, 404, 651, null, 756],
  "Jacob":   [null, null, null, null, null, 922, 842, 830, 905],
  "Matt":    [null, null, null, null, null, 654, 774, 922, 654],
  "Zak":     [null, null, null, null, null, null, 660, 806, 872],
  "Kevin":   [null, null, null, null, null, null, null, null, 899],
};

const LEGACY_ROUNDS = ["R1","R2","R3","R4","R5","R6","R7","R8","R9"].map((name, i) => ({
  name,
  date: `2026-05-0${i + 1}`,
}));

export const INITIAL = {
  activeSeason: "season-1",
  seasons: [
    { id: "season-1", name: "Season 1", rounds: LEGACY_ROUNDS, players: LEGACY_PLAYERS },
  ],
};
