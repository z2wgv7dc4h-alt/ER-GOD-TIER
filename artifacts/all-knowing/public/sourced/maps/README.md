# Map plates

| File | World tab |
|---|---|
| `m1-underground.jpg` | Underground — in (your preview) |
| `m1-underground-hi.jpg` | Same plate, pack PNG scaled to 2400px |
| `m0-overworld.jpg` | Lands Between — **drop this** |

The 176 MB `m0-overworld.png` cannot live in the PWA. From this folder:

```
python3 - <<'PY'
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
im = Image.open('/path/to/m0-overworld.png').convert('RGB')
im.thumbnail((4096, 4096))
im.save('m0-overworld.jpg', 'JPEG', quality=80, optimize=True)
PY
```

Put the jpg next to this README. The atlas already looks for `/sourced/maps/m0-overworld.jpg`.
