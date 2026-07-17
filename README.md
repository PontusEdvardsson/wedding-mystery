# Bröllopsmysteriet

En statisk QR-sida för ett interaktivt bröllopsmysterium i dark mode.

## Filstruktur

- `index.html`: startsida och nav som skickar gästen till rätt uppdrag.
- `uppdrag-1.html`: Wordle-låset med lösningen `SARRI`.
- `uppdrag-2.html`: Trådarna mellan oss, ett Connections-inspirerat ordpussel.
- `uppdrag-2.js`: Connections-inspirerat pussel för uppdrag 2.
- `uppdrag-3.html`: Namnen bakom mysteriet, ett A1Z26-chiffer.
- `uppdrag-3.js`: chifferlogiken för uppdrag 3.
- `uppdrag-4.html`: Sudoku-uppdrag.
- `uppdrag-4.js`: Sudoku-logiken för uppdrag 4.
- `avslutning.html`: det förseglade brevet som alltid ligger sist.
- `avslutning.js`: öppningslogik och sparning för brevet.
- `mystery-config.js`: uppdragens ordning, länkar, tider, krav och texter.
- `shared.js`: gemensam progression, låsning, countdown, preview och reset.
- `uppdrag-1.js`: Wordle-logiken.
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

## Uppdrag 3

Chiffer, avkodad relation och godkända svar ligger i `mystery-config.js` under
`mysterySteps` för `uppdrag-3`, i `puzzle`.

Chifferdata sparas i `weddingMystery.cipher.uppdrag-3`, inklusive om uppdraget
är löst och den avkodade sluttexten.

## Uppdrag 4

Sudoku-lösningen och startsiffrorna ligger i `mystery-config.js` under
`mysterySteps` för `uppdrag-4`, i `puzzle`.

Varje given ruta kan senare få `display` och en rad i `clues`, så att en ruta
kan visa exempelvis `A` medan lösningsvärdet fortfarande är en siffra.

## Lägga till uppdrag

Lägg till ett objekt före steget med `ending: true` i `mysterySteps` i
`mystery-config.js`. Ge det `id`, `page`, `title`, `unlockAt` och `requires`.
Avslutningen kräver automatiskt steget som ligger precis före den, så dess
konfiguration behöver inte ändras. Skapa sedan motsvarande HTML-sida och använd
`shared.js` för progression och tidlås.

## Testlägen

- `?preview=1`: öppnar sidor oavsett tid och tidigare progression.
- `?reset=1`: rensar sparad testdata och laddar sidan i ursprungsläge.

Preview-läget använder separata `localStorage`-nycklar och påverkar därför inte
den riktiga spelprogressionen.

## Ljud

Sidan ska alltid vara helt ljudlös. HTML-sidorna blockerar alla mediafiler med
`Content-Security-Policy: media-src 'none'`, och projektet ska inte använda
`audio`, `video`, Web Audio API eller automatisk uppläsning.

Kör `./verify.ps1` för att kontrollera detta tillsammans med UTF-8, filreferenser,
cacheversioner och pusseldatan. Samma kontroll körs automatiskt på GitHub.

Under utveckling ligger nya uppdrag öppna utan tidslås i `mystery-config.js`.
Sätt tillbaka `unlockAt` när bröllopets faktiska tider är bestämda.
