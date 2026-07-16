# Bröllopsmysteriet

En statisk QR-sida för ett interaktivt bröllopsmysterium i dark mode.

## Filstruktur

- `index.html`: startsida och nav som skickar gästen till rätt uppdrag.
- `uppdrag-1.html`: Wordle-låset med lösningen `SARRI`.
- `uppdrag-2.html`: Trådarna mellan oss, ett Connections-inspirerat ordpussel.
- `uppdrag-2.js`: Connections-inspirerat pussel för uppdrag 2.
- `uppdrag-3.html`: platshållare för tredje mysteriet.
- `final.html`: platshållare för finalen.
- `mystery-config.js`: uppdragens ordning, länkar, tider, krav och texter.
- `shared.js`: gemensam progression, låsning, countdown, preview och reset.
- `uppdrag-1.js`: Wordle-logiken.
- `uppdrag-placeholder.js`: enkel logik för platshållaruppdrag.
- `styles.css`: gemensam dark mode-design.

## Wordle-låset

Lösningen ligger i `mystery-config.js` under `mysterySteps[0].puzzle.answer`
och är just nu `SARRI`.

`maxAttempts: null` betyder obegränsat antal försök. Brädet visar upp till sex
rader åt gången och äldre gissningar ligger kvar i en scrollbar.

## Uppdrag 2

Pusslets ord och kategorier ligger i `mystery-config.js` under
`mysterySteps` för `uppdrag-2`, i `puzzle.groups`.

Connections-data sparas i `weddingMystery.connections.uppdrag-2`, inklusive
slumpad ordning, lösta grupper, felräknare och eventuell cooldown.

## Lägga till uppdrag

Lägg till ett objekt i `mysterySteps` i `mystery-config.js` med `id`, `page`,
`title`, `unlockAt` och `requires`. Skapa sedan motsvarande HTML-sida och använd
`shared.js` för att kontrollera progression och tidlås.

## Testlägen

- `?preview=1`: öppnar sidor oavsett tid och tidigare progression.
- `?reset=1`: rensar sparad testdata och laddar sidan i ursprungsläge.

Under utveckling ligger nya uppdrag öppna utan tidslås i `mystery-config.js`.
Sätt tillbaka `unlockAt` när bröllopets faktiska tider är bestämda.
