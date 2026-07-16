const mysterySteps = [
  {
    id: "uppdrag-1",
    page: "uppdrag-1.html",
    title: "Ordlåset",
    unlockAt: null,
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
    title: "Middagstidens kod",
    unlockAt: null,
    requires: "uppdrag-2",
    clue:
      "När middagen är över finns en kod i tiden. Titta på klockslaget och läs siffrorna som ett par.",
    answer:
      "20:30 blir 2030. Använd koden för nästa ledtråd, eller låt den peka mot ett år, en plats eller ett minne.",
  },
  {
    id: "final",
    page: "final.html",
    title: "Final",
    unlockAt: null,
    requires: "uppdrag-3",
  },
];

const mysteryStorageKeys = {
  progress: "weddingMystery.progress",
  wordle: "weddingMystery.wordle.uppdrag-1",
  connections: "weddingMystery.connections.uppdrag-2",
};
