# Debugowanie gry

## Debug Overlay

Aby tymczasowo wyświetlić informacje debugowe na ekranie, dodaj następujący kod w komponencie `Stacklands` przed `{/* Środek Gry */}`:

```jsx
{/* DEBUG INFO */}
<div style={{ position: "fixed", top: 0, left: 0, background: "rgba(0,0,0,0.8)", color: "#0f0", padding: 10, zIndex: 9999, fontSize: 12, fontFamily: "monospace" }}>
  <div>cards: {cards.length}</div>
  <div>assets: {assets.length}</div>
  <div>CARD_DEFS: {Object.keys(CARD_DEFS).length}</div>
  <div>MAPS: {Object.keys(MAPS).length}</div>
  <div>selectedMapId: {selectedMapId}</div>
  <div>assets content: {assets.map(a => a.id).join(', ')}</div>
</div>
```

### Wyświetlane informacje:

| Pole | Opis |
|------|------|
| `cards` | Liczba kart na stole |
| `assets` | Liczba assetów (budynki, dekoracje) |
| `CARD_DEFS` | Liczba załadowanych definicji kart z YAML |
| `MAPS` | Liczba załadowanych map z JSON |
| `selectedMapId` | ID aktualnie załadowanej mapy |
| `assets content` | Lista ID assetów na stole |

## Debug Cauldron Grid

Aby zobaczyć siatkę 3x3 na kociołku (sloty craftingowe), ustaw flagę na `true`:

```jsx
const DEBUG_CAULDRON_GRID = true; // Linia ~7 w stacklands.jsx
```

## Debug Map Selector

Selector map jest domyślnie włączony. Aby go ukryć:

```jsx
const DEBUG_MAP_SELECTOR = false; // Linia ~8 w stacklands.jsx
```

## Console Logi

Gra loguje następujące informacje podczas ładowania:

```
1. Próba fetchowania plików...
2. Pliki pobrane, sprawdzam statusy...
3. Cards sparsowane: [...]
4. Assets sparsowane: [...]
5. Crafting recipes sparsowane: [...]
6. Loaded maps: [...]
Załadowane definicje kart: [...]
```

## Sprawdzenie błędów

Otwórz konsolę przeglądarki (F12) i sprawdź:
- Czerwone błędy JavaScript
- Nieudane fetchowania plików (404)
- Błędy parsowania YAML/CSV/JSON
