from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LOGO_SOURCE = ROOT / "logo" / "Raccoon University Crest Emblem.png"
SEAL_SOURCE = ROOT / "logo" / "Navy Raccoons University Seal.png"
FRONTEND_LOGO = ROOT / "frontend" / "public" / "logo.png"
PDF_ASSETS = ROOT / "backend" / "src" / "services" / "certificate-pdf" / "assets"
PDF_LOGO = PDF_ASSETS / "logo.png"
PDF_SEAL = PDF_ASSETS / "seal.png"


def remove_white_background(source: Path, destination: Path, size: int = 256) -> None:
    image = Image.open(source).convert("RGBA")
    pixels = image.load()
    width, height = image.size

    for y in range(height):
        for x in range(width):
            r, g, b, _ = pixels[x, y]
            # These source assets use a near-white matte, not real transparency.
            if r > 242 and g > 242 and b > 242:
                pixels[x, y] = (r, g, b, 0)

    bbox = image.getbbox()
    if bbox:
        image = image.crop(bbox)

    padding = 12
    canvas = Image.new("RGBA", (max(image.width, image.height) + padding * 2, max(image.width, image.height) + padding * 2), (0, 0, 0, 0))
    canvas.alpha_composite(
        image,
        ((canvas.width - image.width) // 2, (canvas.height - image.height) // 2),
    )
    canvas.thumbnail((size, size), Image.Resampling.LANCZOS)
    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination, "PNG", optimize=True)


remove_white_background(LOGO_SOURCE, FRONTEND_LOGO)
remove_white_background(LOGO_SOURCE, PDF_LOGO)
remove_white_background(SEAL_SOURCE, PDF_SEAL)

print("created:")
for path in (FRONTEND_LOGO, PDF_LOGO, PDF_SEAL):
    print(f"  {path.relative_to(ROOT)} ({path.stat().st_size} bytes)")
