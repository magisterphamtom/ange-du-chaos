"""Icônes des 6 voies spéciales (même style que tools/icones.py).
Usage : python3 tools/icones_voies.py <dossier_assets_icones>   -> voie-<cle>.webp"""
import sys, math
sys.path.insert(0, __import__("os").path.dirname(__file__))
from icones import *

def faire(f):
    m = calque(); f(ImageDraw.Draw(m)); return m

def pivote(m, ang):
    return m.rotate(ang, resample=Image.BICUBIC, center=(C, C))

def lame(d, x, haut, bas, larg=34):
    poly(d, [(x, haut), (x + larg // 2, haut + 40), (x + larg // 2, bas), (x - larg // 2, bas), (x - larg // 2, haut + 40)], fill=255)

def epee(longueur_haut=70):
    """Épée verticale : lame, garde, poignée, pommeau (masques séparés)."""
    return (faire(lambda d: lame(d, C, longueur_haut, 330, 38)),
            faire(lambda d: (d.rounded_rectangle((C - 64, 330, C + 64, 352), 10, fill=255))),
            faire(lambda d: (d.rounded_rectangle((C - 9, 352, C + 9, 410), 6, fill=255), d.ellipse((C - 20, 408, C + 20, 448), fill=255))))

def protecteur():
    im = cadre(); m = calque(); d = ImageDraw.Draw(m)
    bouclier = [(C, 70), (400, 112), (400, 250), (C, 444), (112, 250), (112, 112)]
    poly(d, bouclier, fill=255); poser(im, m, ARG, ARG2)
    lumiere(im, lambda d: d.line(bouclier + [bouclier[0]], fill=255, width=10, joint="curve"), OR)
    encre(im, lambda d: (d.rectangle((C - 15, 100, C + 15, 400), fill=255), d.rectangle((140, 190, 372, 220), fill=255)), VIO2)
    lumiere(im, lambda d: d.ellipse((C - 42, 176, C + 42, 260), fill=255), OR)
    lumiere(im, lambda d: d.ellipse((C - 20, 198, C + 20, 238), fill=255), VIO)
    return im

def duelliste():
    im = cadre()
    for ang in (38, -38):
        bl, ga, po = epee()
        poser(im, pivote(bl, ang), ARG, ARG2, 10)
        poser(im, pivote(ga, ang), OR, OR2, 10)
        poser(im, pivote(po, ang), OR, OR2, 10)
    lumiere(im, lambda d: d.ellipse((C - 16, C + 36, C + 16, C + 68), fill=255), VIO)
    return im

def tireur():
    im = cadre(); m = calque(); d = ImageDraw.Draw(m)
    # arc
    d.arc((130, 80, 400, 432), 100, 260, fill=255, width=26)
    poser(im, m, OR, OR2, 10)
    # corde + flèche
    def corde(d):
        a = (C - 12 - 6, 100); b = (C - 12 - 6, 412)
        d.line((*a, *b), fill=255, width=5)
    lumiere(im, corde, (230, 232, 245))
    def fleche(d):
        d.line((150, C, 400, C), fill=255, width=14); poly(d, [(430, C), (388, C - 30), (388, C + 30)], fill=255)
    poser(im, faire(fleche), ARG, ARG2, 9)
    lumiere(im, lambda d: (poly(d, [(150, C), (110, C - 34), (140, C - 34), (186, C)], fill=255), poly(d, [(150, C), (110, C + 34), (140, C + 34), (186, C)], fill=255)), VIO)
    return im

def assassin():
    im = cadre()
    # croissant violet derrière
    m = calque(); d = ImageDraw.Draw(m)
    d.ellipse((92, 80, 420, 408), fill=255); d.ellipse((150, 60, 460, 370), fill=0)
    poser(im, m, VIO, VIO2, 8)
    # dague pointe en bas
    bl = faire(lambda d: poly(d, [(C, 438), (C + 26, 330), (C + 22, 190), (C - 22, 190), (C - 26, 330)], fill=255))
    poser(im, bl, ARG, ARG2, 12)
    encre(im, lambda d: d.line((C, 215, C, 400), fill=255, width=6), ARG2)
    poser(im, faire(lambda d: d.rounded_rectangle((C - 62, 160, C + 62, 190), 14, fill=255)), OR, OR2, 10)
    poser(im, faire(lambda d: (d.rounded_rectangle((C - 11, 78, C + 11, 162), 8, fill=255), d.ellipse((C - 22, 62, C + 22, 106), fill=255))), VIO, VIO2, 10)
    return im

def conspirateur():
    im = cadre(); m = calque(); d = ImageDraw.Draw(m)
    # masque : front arrondi, joues, menton pointu
    pts = [(96, 160)]
    for t in range(0, 181, 12):
        a = math.radians(180 + t); pts.append((C + 160 * math.cos(a), 250 + 120 * math.sin(a)))
    pts += [(416, 160), (400, 280), (340, 380), (C, 440), (172, 380), (112, 280)]
    poly(d, pts, fill=255); poser(im, m, ARG, ARG2)
    lumiere(im, lambda d: d.line(pts + [pts[0]], fill=255, width=8, joint="curve"), OR)
    # yeux en amande
    for sx in (-1, 1):
        ex = C + sx * 78
        lumiere(im, lambda d, ex=ex, sx=sx: poly(d, [(ex - 52, 252 - sx * 14), (ex, 214), (ex + 52, 252 + sx * 14), (ex, 286)], fill=255), VIO)
        encre(im, lambda d, ex=ex: d.ellipse((ex - 12, 240, ex + 12, 266), fill=255), ENC)
    # ornement front + doigt sur les lèvres (marque du secret)
    lumiere(im, lambda d: poly(d, [(C, 126), (C + 22, 164), (C, 202), (C - 22, 164)], fill=255), OR)
    encre(im, lambda d: d.line((C - 36, 372, C + 36, 372), fill=255, width=10), VIO2)
    return im

def sorcier():
    im = cadre()
    # bâton en diagonale
    bat = faire(lambda d: d.line((130, 440, 330, 190), fill=255, width=22))
    poser(im, bat, OR, OR2, 10)
    # rayons + orbe + étoile
    def rayons(d):
        for k in range(8):
            a = math.radians(k * 45 + 22)
            d.line((356 + 54 * math.cos(a), 150 + 54 * math.sin(a), 356 + 98 * math.cos(a), 150 + 98 * math.sin(a)), fill=255, width=9)
    lumiere(im, rayons, VIO)
    orbe = faire(lambda d: d.ellipse((312, 106, 400, 194), fill=255))
    poser(im, orbe, (200, 150, 245), VIO2, 10)
    def etoile(d):
        pts = []
        for k in range(8):
            r = 38 if k % 2 == 0 else 13; a = math.radians(k * 45 - 90)
            pts.append((356 + r * math.cos(a), 150 + r * math.sin(a)))
        poly(d, pts, fill=255)
    lumiere(im, etoile, (250, 244, 255))
    # petites étincelles
    for (x, y, r) in [(150, 150, 14), (210, 100, 9), (120, 250, 10)]:
        lumiere(im, lambda d, x=x, y=y, r=r: poly(d, [(x, y - r * 2), (x + r * .6, y - r * .6), (x + r * 2, y), (x + r * .6, y + r * .6), (x, y + r * 2), (x - r * .6, y + r * .6), (x - r * 2, y), (x - r * .6, y - r * .6)], fill=255), ARG)
    return im

VOIES = dict(protecteur=protecteur, duelliste=duelliste, tireur=tireur, assassin=assassin, conspirateur=conspirateur, sorcier=sorcier)

if __name__ == "__main__":
    dossier = sys.argv[1]
    for k, f in VOIES.items():
        f().resize((128, 128), Image.LANCZOS).save(f"{dossier}/voie-{k}.webp", "WEBP", quality=92); print(k)
