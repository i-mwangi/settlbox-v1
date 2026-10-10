import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
source = ET.parse(sys.argv[1]).getroot()
facets = [(node.attrib["points"], node.attrib["fill"]) for node in source if node.tag.endswith("polygon")]
if len(facets) != 7:
    raise ValueError("Expected the seven Settlbox logo facets")


def polygons(color=None):
    return "".join(f'<polygon points="{points}" fill="{color or fill}"/>' for points, fill in facets)


def svg(viewbox, content, width, height):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" width="{width}" height="{height}">{content}</svg>\n'


def save(path, content):
    (root / path).write_text(content, encoding="utf-8")


icon = svg("138 113 224 264", polygons(), 32, 32)
for path in ["public/logo/settlbox-icon.svg", "public/logo/settlbox-icon-dark.svg", "public/token/settlbox.svg"]:
    save(path, icon)

save("public/logo/settlbox-source.svg", svg("0 0 500 500", polygons(), 250, 250))
word = '<text x="0" y="32" font-family="Arial,Helvetica,sans-serif" font-size="36" font-weight="700" letter-spacing="-1" fill="#172133">Settlbox</text>'
save("public/logo/settlbox-wordmark.svg", svg("0 0 137 40", word, 137, 40))
save("public/logo/ash-text-icon.svg", svg("0 0 137 40", word, 137, 40))
for path, color in [("public/logo/settlbox-light.svg", "#FFFFFF"), ("public/settlbox-logo.svg", "#172133")]:
    content = f'<g transform="translate(-19,-16) scale(.15)">{polygons()}</g><text x="40" y="31" font-family="Arial,Helvetica,sans-serif" font-size="32" font-weight="700" letter-spacing="-1" fill="{color}">Settlbox</text>'
    save(path, svg("0 0 164 42", content, 164, 42))

gradient = '<defs><linearGradient id="watermark" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#F4F4F4"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient></defs>'
save("public/card/background.svg", svg("138 113 224 264", gradient + polygons("url(#watermark)"), 124, 156))
save("public/gift/background-settlbox-text.svg", svg("0 0 829 424", '<text x="414.5" y="285" text-anchor="middle" textLength="800" lengthAdjust="spacingAndGlyphs" font-family="Arial,Helvetica,sans-serif" font-size="205" font-weight="800" fill="#FFFFFF">Settlbox</text>', 829, 424))

medallion = '<defs><linearGradient id="surface" x2="1" y2="1"><stop stop-color="#F1F6FF"/><stop offset="1" stop-color="#CEDDFF"/></linearGradient></defs><circle cx="250" cy="245" r="205" fill="url(#surface)"/><circle cx="250" cy="245" r="188" fill="none" stroke="#A5BEFF" stroke-width="5"/>'
for path, width, height in [
    ("public/logo/3d-settlbox-icon.svg", 48, 49),
    ("public/logo/3d-settlbox-coin.svg", 247, 247),
    ("public/modal/hexagon-settlbox-icon.svg", 180, 181),
    ("public/modal/3d-hexagon-settlbox-icon.svg", 180, 181),
]:
    artwork = medallion + polygons() if path == "public/logo/3d-settlbox-coin.svg" else polygons()
    viewbox = "20 15 460 460" if path == "public/logo/3d-settlbox-coin.svg" else "138 113 224 264"
    save(path, svg(viewbox, artwork, width, height))
save("public/gift/open-gift/settlbox-coin.svg", svg("0 0 584 300", f'<g transform="translate(142,-95) scale(.6)">{medallion}{polygons()}</g>', 292, 150))


def clip_reveal(coordinates, progress):
    if progress >= 1:
        return coordinates
    if progress <= 0:
        return []
    start, end = coordinates[0], coordinates[2]
    direction = (end[0] - start[0], end[1] - start[1])
    projections = [x * direction[0] + y * direction[1] for x, y in coordinates]
    threshold = min(projections) + (max(projections) - min(projections)) * progress
    result = []
    previous = coordinates[-1]
    previous_distance = previous[0] * direction[0] + previous[1] * direction[1] - threshold
    for current in coordinates:
        distance = current[0] * direction[0] + current[1] * direction[1] - threshold
        if (distance <= 0) != (previous_distance <= 0):
            fraction = previous_distance / (previous_distance - distance)
            result.append((previous[0] + fraction * (current[0] - previous[0]), previous[1] + fraction * (current[1] - previous[1])))
        if distance <= 0:
            result.append(current)
        previous, previous_distance = current, distance
    return result


def render(size, progress=None, opacity=1, background=(255, 255, 255, 0)):
    image = Image.new("RGBA", (size * 4, size * 4), background)
    draw = ImageDraw.Draw(image)
    factor = size * 4 / 300
    for index, (points, fill) in enumerate(facets):
        coordinates = [tuple(float(value) for value in pair.split(",")) for pair in points.split()]
        if progress is not None:
            reveal = max(0, min(1, (progress - index * 6) / 8))
            reveal = reveal * reveal * (3 - 2 * reveal)
            coordinates = clip_reveal(coordinates, reveal)
        if len(coordinates) < 3:
            continue
        rgb = tuple(int(fill[channel:channel + 2], 16) for channel in (1, 3, 5))
        color = (*rgb, round(255 * opacity))
        draw.polygon([((x - 250) * factor + size * 2, (y - 245) * factor + size * 2) for x, y in coordinates], fill=color)
    return image.resize((size, size), Image.Resampling.LANCZOS)


frames = []
for frame in range(80):
    opacity = max(0, min(1, (70 - frame) / 8))
    image = render(192, max(0, frame - 3), opacity)
    indexed = image.convert("RGB").quantize(colors=255)
    alpha = image.getchannel("A").convert("1")
    indexed.paste(255, mask=alpha.point(lambda value: 255 - value))
    indexed.info["transparency"] = 255
    frames.append(indexed)
frames[0].save(root / "public/logo/loading.gif", save_all=True, append_images=frames[1:], duration=30, loop=0, disposal=2, transparency=255, optimize=False)
render(64).save(root / "app/favicon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64)])
render(192).save(root / "public/logo/settlbox-preview.png")
print("Updated Settlbox icons, wordmarks, watermarks, illustrations, animated loader, and favicon")
