const mysteryHome = {
  countdownTarget: "2026-08-01T17:30:00",
};

const mysterySteps = [
  {
    id: "uppdrag-1",
    page: "uppdrag-1.html",
    title: "Ordlåset",
    unlockAt: null,
    hintUnlockAt: "2026-08-01T17:30:00",
    hintText: "Brudens smeknamn",
    requires: null,
    clue: "Lös det fem bokstäver långa ordet för att komma vidare.",
    answer: "SARRI",
    puzzle: {
      type: "wordle",
      answer: "SARRI",
      maxAttempts: null,
      visibleRows: 6,
    },
  },
  {
    id: "uppdrag-2",
    page: "uppdrag-2.html",
    title: "Trådarna mellan oss",
    unlockAt: null,
    hintUnlockAt: "2026-08-01T18:00:00",
    hintText: "Placeholder-ledtråd för uppdrag 2.",
    requires: "uppdrag-1",
    clue: "Hitta fyra dolda samband. Varje grupp består av fyra ord.",
    puzzle: {
      type: "connections",
      cooldownMs: 5 * 60 * 1000,
      mistakesBeforeCooldown: 3,
      groups: [
        {
          id: "band",
          title: "Band",
          words: ["PARKWAY DRIVE", "METALLICA", "GHOST", "JOURNEY"],
        },
        {
          id: "marstrand",
          title: "Marstrand",
          words: ["FERRY", "FORTRESS", "CHURCH", "SEA"],
        },
        {
          id: "brollopsresan",
          title: "Bröllopsresan",
          words: ["GOLF", "WHISKY", "HARRY POTTER", "HIGHLANDS"],
        },
        {
          id: "brollopsfesten",
          title: "Bröllopsfesten",
          words: ["TOAST", "CAKE", "DANCING", "SPEECHES"],
        },
      ],
    },
  },
  {
    id: "uppdrag-3",
    page: "uppdrag-3.html",
    title: "Namnen bakom mysteriet",
    unlockAt: null,
    hintUnlockAt: "2026-08-01T18:30:00",
    hintText: "Placeholder-ledtråd för uppdrag 3.",
    requires: "uppdrag-2",
    clue: "Avkoda ledtråden och skriv in namnet på personen vi söker.",
    puzzle: {
      type: "a1z26-person",
      encodedText: "2 18 21 4 5 14 19   13 15 18",
      decodedText: "BRUDENS MOR",
      acceptedAnswers: ["ELINA"],
      successTitle: "Rätt!",
      successText: "",
    },
  },
  {
    id: "uppdrag-4",
    page: "uppdrag-4.html",
    title: "Förseglat kapitel",
    unlockAt: null,
    hintUnlockAt: "2026-08-01T19:00:00",
    hintText: "Placeholder-ledtråd för uppdrag 4.",
    requires: "uppdrag-3",
    clue: "Nästa uppdrag byggs här.",
    answer: "Placeholder för nästa svar.",
  },
  {
    id: "final",
    page: "final.html",
    title: "Final",
    unlockAt: null,
    requires: "uppdrag-4",
  },
];

const mysteryStorageKeys = {
  progress: "weddingMystery.progress",
  wordle: "weddingMystery.wordle.uppdrag-1",
  connections: "weddingMystery.connections.uppdrag-2",
  cipher: "weddingMystery.cipher.uppdrag-3",
};
