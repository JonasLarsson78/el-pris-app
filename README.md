# El Pris

macOS-app som visar svenska elpriser i realtid, per elzon och dag.

Byggd med Tauri 2, Vue 3 och Vite.

## Funktioner

- **Dagvy** – timvis och kvartsprisdiagram (stapel eller linje) med färgkodning från grönt (billigt) till rött (dyrt). Scrollar automatiskt till nuvarande tid med en markör som visar aktuellt pris.
- **Historik** – översikt över de senaste 7 dagarnas snittpriser med diagram och tabell (min/snitt/max per dag).
- **Kostnad** – beräkna månadskostnad baserat på förbrukning och elzon. Jämför priser från flera elleverantörer. Stöd för att inkludera elnätskostnader.
- Välj elzon SE1–SE4
- Mörkt och ljust läge följer systeminställningen

## Installation

Ladda ner senaste `.dmg` från [Releases](../../releases) och dra appen till Applications-mappen.

### "El Pris is damaged and can't be opened"

macOS blockerar appar som inte är signerade med ett Apple Developer-certifikat. Kör följande kommando i terminalen för att kringgå detta:

```bash
xattr -cr /Applications/El\ Pris.app
```

Öppna sedan appen som vanligt.

## Utveckling

```bash
npm install
npm run tauri dev
```

## Bygga

```bash
npm run tauri build
```

Eller via GitHub Actions – en release med DMG (macOS) och EXE (Windows) skapas automatiskt när du pushar en tagg:

```bash
npm run new:version 1.2.0
git add .
git commit -m "v1.2.0"
git tag v1.2.0
git push origin main --tags
```
