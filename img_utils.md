# img_utils.py - Image Outline Tool

Dodaje obrys (outline) wokół nieprzezroczystych części obrazka PNG.

## Szybki start

```bash
python img_utils.py assets/martial_arena4.png assets/martial_arena4b.png
```

## Użycie w Pythonie

```python
from img_utils import add_padding_and_outline

add_padding_and_outline(
    'assets/martial_arena4.png',  # input
    'assets/martial_arena4b.png',  # output
    padding=12,      # padding wokół obrazka (px)
    thickness=10,    # grubość obrysu (px)
    outline_color=(255, 255, 255)  # biały (B, G, R)
)
```

## Funkcje

| Funkcja | Opis |
|---------|------|
| `add_outline_cv2(path, out, thickness=5, color=(255,255,255))` | Tylko obrys |
| `add_padding_and_outline(path, out, padding=12, thickness=10, color=(255,255,255))` | Padding + obrys |

## Kolory

```python
(255, 255, 255)  # Biały
(0, 0, 0)        # Czarny
(0, 0, 255)      # Niebieski (BGR!)
(0, 255, 0)      # Zielony (BGR!)
(255, 0, 0)      # Czerwony (BGR!)
```

> **Uwaga:** OpenCV używa formatu **BGR** nie RGB!
