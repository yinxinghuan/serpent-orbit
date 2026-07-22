from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "_production" / "poster-source-3.webp"
OUTPUT = ROOT / "public" / "poster.png"
THUMB = ROOT / "_production" / "poster-thumb.png"
FONT = "/System/Library/Fonts/Supplemental/Didot.ttc"

image = Image.open(SOURCE).convert("RGB")
overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
draw = ImageDraw.Draw(overlay)

for y in range(0, 220):
    alpha = round(112 * (1 - y / 220) ** 1.6)
    draw.line((0, y, image.width, y), fill=(0, 0, 0, alpha))

title = "SERPENT HALO"
font = ImageFont.truetype(FONT, 78)
bbox = draw.textbbox((0, 0), title, font=font)
x = (image.width - (bbox[2] - bbox[0])) / 2
y = 38
draw.text((x + 2, y + 3), title, font=font, fill=(0, 0, 0, 155))
draw.text((x, y), title, font=font, fill=(239, 241, 237, 255))

image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
image.save(OUTPUT, format="PNG", optimize=True)
image.resize((160, 160), Image.Resampling.LANCZOS).save(THUMB, format="PNG", optimize=True)
