"""Fabrique les jetons ronds (anneau brun/rouge comme ceux du livre) à partir d'illustrations carrées.
Usage : python3 tools/jetons.py <carte.json> <dossier_sources> <dossier_assets>
carte.json : { "cle": {"fichier": "xxx.jpg", "zoom": 0.8, "dx": 0, "dy": 0}, ... }
Écrit <assets>/tokens/<cle>.webp (400 px) : sert de jeton et de portrait."""
import sys, json, os
from PIL import Image, ImageDraw
N = 400
def jeton(src, zoom=0.8, dx=0, dy=0):
    im = Image.open(src).convert("RGB"); w, h = im.size
    c = int(min(w, h) * zoom); cx, cy = w // 2 + int(dx * w), h // 2 + int(dy * h)
    x0 = max(0, min(w - c, cx - c // 2)); y0 = max(0, min(h - c, cy - c // 2))
    im = im.crop((x0, y0, x0 + c, y0 + c)).resize((N, N), Image.LANCZOS)
    S = 4; big = Image.new("RGBA", (N * S, N * S), (0, 0, 0, 0)); d = ImageDraw.Draw(big)
    d.ellipse((0, 0, N * S - 1, N * S - 1), fill=(58, 35, 23, 255))
    d.ellipse((9 * S, 9 * S, (N - 9) * S, (N - 9) * S), fill=(143, 55, 50, 255))
    d.ellipse((14 * S, 14 * S, (N - 14) * S, (N - 14) * S), fill=(0, 0, 0, 255))
    ring = big.resize((N, N), Image.LANCZOS)
    m = Image.new("L", (N * S, N * S), 0); ImageDraw.Draw(m).ellipse((14 * S, 14 * S, (N - 14) * S, (N - 14) * S), fill=255)
    m = m.resize((N, N), Image.LANCZOS)
    ring.paste(im.convert("RGBA"), (0, 0), m)
    return ring
if __name__ == "__main__":
    carte, src, assets = sys.argv[1:4]
    for cle, c in json.load(open(carte)).items():
        t = jeton(os.path.join(src, c["fichier"]), c.get("zoom", 0.8), c.get("dx", 0), c.get("dy", 0))
        os.makedirs(os.path.join(assets, "tokens"), exist_ok=True)
        t.save(os.path.join(assets, "tokens", f"{cle}.webp"), "WEBP", quality=90)
        print(cle)
