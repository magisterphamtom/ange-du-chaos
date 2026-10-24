"""Génère les icônes fantasy (cadre or / fond violet sombre, glyphes argent-or-violet) dans assets/icones.
Usage : python3 tools/icones.py <dossier_assets_icones>"""
import sys, math
from PIL import Image, ImageDraw, ImageFilter, ImageChops
S = 512
OR, OR2 = (226, 184, 92), (158, 120, 40)
ARG, ARG2 = (236, 238, 246), (150, 156, 184)
VIO, VIO2 = (170, 110, 215), (96, 52, 140)
NUIT, NUIT2 = (38, 32, 84), (22, 18, 52)
ENC = (14, 10, 30)

def cadre():
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    m = Image.new("L", (S, S), 0); ImageDraw.Draw(m).rounded_rectangle((8, 8, S - 8, S - 8), 70, fill=255)
    fond = Image.new("RGBA", (S, S))
    d = ImageDraw.Draw(fond)
    for y in range(S):
        t = y / S; d.line((0, y, S, y), fill=tuple(int(NUIT[i] * (1 - t) + NUIT2[i] * t) for i in range(3)) + (255,))
    im.paste(fond, (0, 0), m)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((8, 8, S - 8, S - 8), 70, outline=OR, width=16)
    d.rounded_rectangle((24, 24, S - 24, S - 24), 58, outline=OR2, width=4)
    d.rounded_rectangle((38, 38, S - 38, S - 38), 46, outline=VIO2, width=5)
    return im

def calque():
    return Image.new("L", (S, S), 0)

def poser(im, masque, haut, bas, contour=14):
    """Pose un glyphe (masque L) avec contour sombre et dégradé vertical haut→bas."""
    gros = masque.filter(ImageFilter.MaxFilter(contour * 2 + 1))
    sombre = Image.new("RGBA", (S, S), ENC + (255,)); im.paste(sombre, (0, 0), gros)
    g = Image.new("RGBA", (S, S)); d = ImageDraw.Draw(g)
    for y in range(S):
        t = y / S; d.line((0, y, S, y), fill=tuple(int(haut[i] * (1 - t) + bas[i] * t) for i in range(3)) + (255,))
    im.paste(g, (0, 0), masque)

def encre(im, f, couleur=ENC):
    """Détails sombres par-dessus (f dessine sur un masque)."""
    m = calque(); f(ImageDraw.Draw(m)); im.paste(Image.new("RGBA", (S, S), couleur + (255,)), (0, 0), m)

def lumiere(im, f, couleur):
    m = calque(); f(ImageDraw.Draw(m)); im.paste(Image.new("RGBA", (S, S), couleur + (255,)), (0, 0), m)

C = S // 2
def poly(d, pts, **k): d.polygon(pts, **k)

def rune():
    im = cadre(); m = calque(); d = ImageDraw.Draw(m)
    d.ellipse((98, 98, 414, 414), fill=255)
    poser(im, m, VIO, VIO2)
    # glyphe runique gravé : barre verticale, deux traits obliques, jambage
    def g(d):
        d.line((C - 20, 150, C - 20, 366), fill=255, width=26)
        d.line((C - 20, 150, C + 70, 214), fill=255, width=26); d.line((C + 70, 214, C - 20, 270), fill=255, width=26)
        d.line((C - 20, 270, C + 80, 366), fill=255, width=26)
    lumiere(im, g, OR)
    lumiere(im, lambda d: d.ellipse((98, 98, 414, 414), outline=255, width=8), OR2)
    return im

def gemmelite():
    im = cadre(); m = calque(); d = ImageDraw.Draw(m)
    pts = [(C, 84), (360, 150), (400, 260), (C, 432), (112, 260), (152, 150)]
    poly(d, pts, fill=255); poser(im, m, (200, 150, 245), VIO2)
    def facettes(d):
        for a, b in [((152, 150), (360, 150)), ((112, 260), (400, 260)), ((152, 150), (C, 260)), ((360, 150), (C, 260)), ((C, 84), (C, 150)), ((112, 260), (C, 432)), ((400, 260), (C, 432)), ((C, 260), (C, 432))]:
            d.line((*a, *b), fill=255, width=7)
    encre(im, facettes, (70, 30, 110))
    lumiere(im, lambda d: poly(d, [(190, 170), (250, 170), (215, 230), (170, 230)], fill=255), (250, 240, 255))
    return im

def zen():
    im = cadre(); m = calque(); d = ImageDraw.Draw(m)
    d.ellipse((92, 92, 420, 420), fill=255); poser(im, m, ARG, ARG2)
    # yin-yang
    def yy(d):
        d.pieslice((92, 92, 420, 420), 90, 270, fill=255)
        d.ellipse((C - 82, 92, C + 82, 256), fill=255)
        d.ellipse((C - 82, 256, C + 82, 420), fill=0)
    encre(im, yy, (60, 40, 110))
    lumiere(im, lambda d: d.ellipse((C - 22, 150, C + 22, 194), fill=255), OR)
    lumiere(im, lambda d: d.ellipse((C - 22, 318, C + 22, 362), fill=255), OR)
    lumiere(im, lambda d: d.ellipse((92, 92, 420, 420), outline=255, width=9), OR)
    return im

def initie():
    im = cadre(); m = calque(); d = ImageDraw.Draw(m)
    # paume ouverte stylisée : trois doigts + pouce + paume
    d.rounded_rectangle((150, 270, 362, 410), 50, fill=255)
    for x0, h in [(150, 130), (210, 90), (270, 100), (330, 150)]:
        d.rounded_rectangle((x0, h + 20, x0 + 44, 300), 22, fill=255)
    poly(d, [(150, 330), (96, 270), (110, 230), (170, 290)], fill=255)
    poser(im, m, ARG, ARG2)
    lumiere(im, lambda d: d.ellipse((C - 40, 296, C + 40, 376), fill=255), VIO)
    lumiere(im, lambda d: d.ellipse((C - 40, 296, C + 40, 376), outline=255, width=7), OR)
    return im

def maladie():
    im = cadre(); m = calque(); d = ImageDraw.Draw(m)
    d.ellipse((140, 140, 372, 372), fill=255)
    for k in range(8):
        a = k * math.pi / 4; x, y = C + 150 * math.cos(a), C + 150 * math.sin(a)
        d.line((C + 110 * math.cos(a), C + 110 * math.sin(a), x, y), fill=255, width=26)
        d.ellipse((x - 26, y - 26, x + 26, y + 26), fill=255)
    poser(im, m, (190, 230, 160), (80, 130, 80))
    lumiere(im, lambda d: [d.ellipse((C - 60, C - 70, C - 20, C - 30), fill=255), d.ellipse((C + 20, C + 10, C + 70, C + 60), fill=255), d.ellipse((C - 30, C + 40, C, C + 70), fill=255)], (230, 255, 200))
    lumiere(im, lambda d: d.ellipse((140, 140, 372, 372), outline=255, width=8), OR)
    return im

def lingot(haut, bas, fissure=False, eclat=False):
    im = cadre(); m = calque(); d = ImageDraw.Draw(m)
    poly(d, [(120, 330), (200, 190), (400, 190), (352, 330)], fill=255)
    poly(d, [(120, 330), (352, 330), (352, 372), (120, 372)], fill=255)
    poser(im, m, haut, bas)
    encre(im, lambda d: d.line((120, 330, 352, 330), fill=255, width=7), tuple(int(c * .5) for c in bas))
    lumiere(im, lambda d: poly(d, [(214, 205), (330, 205), (312, 236), (200, 236)], fill=255), (255, 255, 255))
    if fissure:
        encre(im, lambda d: d.line((260, 195, 240, 250, 276, 290, 250, 360), fill=255, width=10), ENC)
    if eclat:
        for x, y, r in [(110, 150, 26), (400, 140, 20), (420, 300, 16)]:
            lumiere(im, lambda d, x=x, y=y, r=r: poly(d, [(x, y - r), (x + r / 3, y - r / 3), (x + r, y), (x + r / 3, y + r / 3), (x, y + r), (x - r / 3, y + r / 3), (x - r, y), (x - r / 3, y - r / 3)], fill=255), (255, 245, 200))
    return im

def enclume():
    im = cadre(); m = calque(); d = ImageDraw.Draw(m)
    poly(d, [(80, 200), (400, 200), (440, 230), (360, 264), (330, 264), (340, 330), (390, 372), (122, 372), (172, 330), (182, 264), (150, 264), (80, 240)], fill=255)
    poser(im, m, ARG, ARG2)
    lumiere(im, lambda d: poly(d, [(110, 210), (380, 210), (395, 226), (118, 226)], fill=255), (255, 255, 255))
    lumiere(im, lambda d: d.line((130, 372, 380, 372), fill=255, width=10), OR)
    return im

def guide():
    im = cadre(); m = calque(); d = ImageDraw.Draw(m)
    poly(d, [(C, 170), (96, 140), (96, 360), (C, 392)], fill=255); poly(d, [(C, 170), (416, 140), (416, 360), (C, 392)], fill=255)
    poser(im, m, OR, OR2)
    def pages(d):
        poly(d, [(C - 14, 184), (118, 160), (118, 336), (C - 14, 366)], fill=255); poly(d, [(C + 14, 184), (394, 160), (394, 336), (C + 14, 366)], fill=255)
    lumiere(im, pages, (240, 232, 214))
    def lignes(d):
        for k in range(4):
            y = 200 + k * 30
            d.line((140, y - 12 + k * 4, 236, y + 8 + k * 4), fill=255, width=6); d.line((276, y + 8 + k * 4, 372, y - 12 + k * 4), fill=255, width=6)
    encre(im, lignes, VIO2)
    lumiere(im, lambda d: d.ellipse((C - 26, 80, C + 26, 132), fill=255), VIO)
    return im

ICONES = dict(rune=rune, gemmelite=gemmelite, zen=zen, initie=initie, maladie=maladie, materiau=enclume, guide=guide,
              **{"lingot-mediocre": lambda: lingot((150, 120, 100), (80, 60, 50), fissure=True),
                 "lingot-standard": lambda: lingot((200, 205, 220), (120, 126, 150)),
                 "lingot-superieur": lambda: lingot((250, 252, 255), (140, 150, 190), eclat=True),
                 "lingot-ultime": lambda: lingot((255, 225, 120), (150, 90, 190), eclat=True)})

if __name__ == "__main__":
    dossier = sys.argv[1]
    for nom, f in ICONES.items():
        f().resize((128, 128), Image.LANCZOS).save(f"{dossier}/{nom}.webp", "WEBP", quality=92)
        print(nom)
