"""Améliore les guides de module (data/guides.json) : traits d'union perdus à la conversion (voulezvous -> voulez-vous),
césures restantes, pieds de page du livre, découpage des longues pages en pages courtes (un titre = une page).
Usage : python3 tools/guide_ameliorer.py guides.json sortie.json   (nécessite : pip install wordfreq)"""
import json, re, sys, html as H
from wordfreq import zipf_frequency as Z

LET = "A-Za-zÀ-ÿŒœ"
MOT = re.compile(r"[%s]{5,}" % LET)
PRON = {"vous", "nous", "moi", "toi", "lui", "leur", "ils", "elles", "elle", "il", "on", "je", "tu", "là", "ci", "même", "mêmes", "ce", "les", "le", "la", "en", "y"}
FIN_IMP = re.compile(r"(ez|ons|e)$")
FIN_V = re.compile(r"(ez|ons|e|s|t|d|ent|a|ai|ait|rait|is|us|ts)$")
COMPOSES = """citésfranches citéfranche compagniesfranches compagniefranche changepeau changepeaux laissezpasser gardemanger nordouest
mortvivant mortsvivants mercenairesfrancs mercenairefranc mercenairesfranc saufconduit guerrierdémon démondragon toutepuissance horsdestin
maîtreespion maîtresseespionne arrièreboutique quarantecinq vingtcinq soixantequatorze trentetrois hommemystère passetemps brunroux
mainforte villeschampignons villechampignon prêtresguerriers quasitotalité sansclans
horsnorme gardeschasses arrièresalle arrièresalles terreplein croquemort sangchaud sangchauds personnagejoueur arrièreplan pontlevis
coursepoursuite cachepoussière cachepoussières avantbras sangfroid libreéchange hommesoiseaux sansabri bienaimée couvrefeux francstireurs
coupegorges savoirfaire territoiresfrancs coupechou coupechoux canneépée grisbleu boisvivant poulegarou adjudantchef étatmajor
francparler sucréssalés parci parlà garderobe brunrouge salonbibliothèque arrachepied crapaudmonstre outreterre doublelames hommesanglier
prêtresorcier maîtreforgeron citéforteresse vousmême ellemême matinmême euxmêmes noirmétal basseville peutêtre
typelà genrelà momentlà annéelà assautlà choseslà centremême semidivine semidécouvert semipénombre semiconscience semicirculaire
maîtressorciers maîtressculpteurs comptegouttes sacrosaintes troismâts bâtonéclair arrièregoût laisseraller laissezpasser""".split()
CAS = {c: None for c in COMPOSES}

def restaurer(mot):
    b = mot.lower()
    if b in CAS:
        for i in range(2, len(mot) - 1):
            pass
    cand = None
    if b in CAS:
        # place le trait d'union à la frontière la plus plausible (deux morceaux connus)
        best = None
        for i in range(2, len(b) - 1):
            a, c = b[:i], b[i:]
            s = min(Z(a, "fr"), Z(c, "fr"))
            if best is None or s > best[0]: best = (s, i)
        if b == "peutêtre": best = (0, 4)
        return mot[:best[1]] + "-" + mot[best[1]:]
    if Z(b, "fr") >= 1.5: return None
    meilleur = None
    for i in range(3, len(b) - 1):
        a, c = b[:i], b[i:]
        if c not in PRON or Z(a, "fr") < 2.5: continue
        if c in {"le", "la", "les", "en", "y", "ce"} and not FIN_IMP.search(a): continue
        if c in {"on", "il", "je", "tu", "ils", "elle", "elles"} and not FIN_V.search(a): continue
        s = Z(a, "fr")
        if meilleur is None or s > meilleur[0]: meilleur = (s, i)
    return mot[:meilleur[1]] + "-" + mot[meilleur[1]:] if meilleur else None

def sur_texte(h, f):
    return "".join(p if p.startswith("<") else f(p) for p in re.split(r"(<[^>]+>)", h))

def texte_corrige(t):
    t = re.sub(r"([%s])- ([a-zàâçéèêëîïôûùüœ])" % LET, lambda m: m.group(1) + m.group(2) if Z(m.group(1) + m.group(2), "fr") >= 0 else m.group(0), t)
    return MOT.sub(lambda m: restaurer(m.group(0)) or m.group(0), t)

def corrige_cesures(t):
    # "Arts du com- bat" : joint quand le mot recollé est connu, sinon garde le trait d'union
    def f(m):
        a, b = m.group(1), m.group(2)
        mot = (a + b).lower()
        if Z(mot, "fr") >= 1.5: return a + b
        if Z(a.lower(), "fr") >= 2.5 and Z(b.lower(), "fr") >= 2.0: return a + "-" + b
        return a + b
    return re.sub(r"([%s]{2,})- ([a-zàâçéèêëîïôûùüœ]+)" % LET, f, t)

def corrige(h):
    h = re.sub(r"<h2>dans le monde des Plans R monde des Plans</h2><h2>encontres dans le</h2>", "<h2>Introduction aux rencontres</h2>", h)
    h = sur_texte(h, corrige_cesures)
    return sur_texte(h, lambda t: MOT.sub(lambda m: restaurer(m.group(0)) or m.group(0), t))

PIED = re.compile(r"^(?:[^<>]{0,60}, (?:Michel Robert|Rodolphe Vanhoorde|[A-ZÉ][\w’' -]{3,25} [A-ZÉ][\w’-]+)|\d{1,3}|L’Ange du Chaos)$")
def elements(h): return re.findall(r"<(?:p|h2|h3|h4|ul|table)[^>]*>.*?</(?:p|h2|h3|h4|ul|table)>", h, flags=re.S)
def txt(e): return H.unescape(re.sub(r"<[^>]+>", "", e)).strip()

def sans_pieds(els):
    out = []
    for e in els:
        t = txt(e)
        if e.startswith("<p>") and len(t) < 60 and (re.fullmatch(r"\d{1,3}", t) or re.search(r", (Michel Robert|Rodolphe Vanhoorde|Maurice [A-Z]\w+)$", t)):
            continue
        out.append(e)
    return out

def decouper(nom, h, seuil=14000):
    els = sans_pieds(elements(h))
    pages, cur, titre = [], [], nom
    def clore():
        nonlocal cur
        if cur: pages.append([titre, cur])
        cur = []
    for e in els:
        if e.startswith("<h2"):
            clore(); titre = txt(e) or nom
        cur.append(e)
    clore()
    # fusionne les sections trop petites avec la précédente
    fus = []
    for t, c in pages:
        if fus and sum(map(len, c)) < 1800 and sum(map(len, fus[-1][1])) < 12000: fus[-1][1].extend(c)
        else: fus.append([t, c])
    while len(fus) > 1 and sum(map(len, fus[0][1])) < 900:   # page d'ouverture presque vide : fondue dans la suivante
        fus[1][1] = fus[0][1] + fus[1][1]; fus.pop(0)
    # coupe les pages trop longues aux sous-titres puis aux paragraphes
    res = []
    for t, c in fus:
        if sum(map(len, c)) <= seuil: res.append([t, c]); continue
        n, part, taille = 1, [], 0
        for e in c:
            coupe = taille > 7000 and (e.startswith("<h3") and 'adcencadre' not in e or e.startswith("<h2") or taille > seuil)
            if coupe and part:
                res.append([t if n == 1 else f"{t} (suite {n - 1})", part]); n += 1; part, taille = [], 0
            part.append(e); taille += len(e)
        if part: res.append([t if n == 1 else f"{t} (suite {n - 1})", part])
    return [{"name": t, "html": "".join(c).replace("<p>• ", '<p class="adc-puce">• ')} for t, c in res]

def nom_propre(n):
    n = corrige_cesures(n)
    return re.sub(r"\s+", " ", n).strip()

def main(ent, sor):
    d = json.load(open(ent, encoding="utf8"))
    stats = {"pages_avant": 0, "pages_apres": 0}
    for g in d["guides"]:
        for j in g["journaux"]:
            nouv = []
            for p in j["pages"]:
                stats["pages_avant"] += 1
                h = corrige(p["html"])
                nouv += decouper(nom_propre(p["name"]), h)
            noms = {}
            for p in nouv:
                n = p["name"]; noms[n] = noms.get(n, 0) + 1
                if noms[n] > 1: p["name"] = f"{n} ({noms[n]})"
                p["name"] = "Introduction aux rencontres" if p["name"].startswith("dans le monde des Plans R") else corrige(p["name"])
            j["pages"] = nouv; j["name"] = nom_propre(j["name"])
            stats["pages_apres"] += len(nouv)
    json.dump(d, open(sor, "w", encoding="utf8"), ensure_ascii=False)
    print(stats)

if __name__ == "__main__": main(sys.argv[1], sys.argv[2])
