"""Convertit un livre-guide (PDF → dump JSON de dump.py) en journaux du wiki (texte HTML, sans images).
Usage : python3 tools/guide_en_journaux.py dump.json sortie.json [config.json]
config : {"exclure":[pages 1-based à ignorer], "parties":[{"nom":"Acte I","de":6,"a":41}, ...]}
Mise en page : colonnes lues de gauche à droite ; titres Killigrew ≥ 30 pt = pages du journal ; Buckingham 18 pt = intertitres ;
Buckingham en majuscules = encadrés ; Warnock gras 12,2 = sous-titres ; italique/gras conservés."""
import json, sys, re, html

dump = json.load(open(sys.argv[1]))
cfg = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else {}
exclure = set(cfg.get("exclure", []))
esc = lambda s: html.escape(s, quote=False)

def inutile(b):
    s = b["lines"][0]["sp"][0]
    t = "".join(x[0] for l in b["lines"] for x in l["sp"]).strip()
    if s[2].startswith("Helvetica") and s[1] < 5: return True
    if "Stephane BEZIER" in t: return True
    if s[2].startswith("Quadrat"): return True              # titre courant
    if re.fullmatch(r"\d{1,3}", t): return True             # numéro de page
    if s[2].startswith("Killigrew") and s[1] >= 60 and not re.search(r"[a-zé]{3}", t): return True
    if re.fullmatch(r"[A-Z ]{2,20}", t) and s[1] > 50: return True   # filigrane « LE JEU DE RÔLE »
    return False

def ordre(blocs, largeur):
    milieu = largeur / 2
    plein = lambda b: (b["bbox"][2] - b["bbox"][0]) > 380
    res, bande = [], []
    def vider():
        g = sorted([b for b in bande if b["bbox"][0] < milieu], key=lambda b: b["bbox"][1])
        d = sorted([b for b in bande if b["bbox"][0] >= milieu], key=lambda b: b["bbox"][1])
        res.extend(g + d); bande.clear()
    for b in sorted(blocs, key=lambda b: b["bbox"][1]):
        if plein(b): vider(); res.append(b)
        else: bande.append(b)
    vider()
    return res

def span_html(txt, flags, font):
    t = esc(txt)
    gras = (flags & 16) or "Bold" in font
    ital = (flags & 2) or font.endswith("-It") or "It" in font.split("-")[-1][:3]
    if gras and ital: return f"<strong><em>{t}</em></strong>"
    if gras: return f"<strong>{t}</strong>"
    if ital: return f"<em>{t}</em>"
    return t

def est_titre_span(s): return (s[2].startswith("Buckingham") and s[1] >= 17.5) or (s[2].startswith("Killigrew") and s[1] >= 25)

def decouper(b):
    """(titre spans, [paragraphes html], premier_indente) d'un bloc : une ligne en retrait ouvre un paragraphe."""
    titre, paras, cur, prec = [], [], [], None
    x0 = b["bbox"][0]; lignes = b["lines"]; premier_indente = False
    for li, l in enumerate(lignes):
        txt_l = ""
        for s in l["sp"]:
            if est_titre_span(s) and not paras and not cur: titre.append((s[0], s[1], s[2]))
            else: txt_l += span_html(s[0], s[3], s[2])
        if not txt_l: continue
        plain = re.sub(r"<[^>]+>", "", txt_l)
        # nouveau paragraphe : retrait, ou interligne nettement plus grand que le pas des lignes du bloc
        pas = sorted(lignes[k + 1]["y0"] - lignes[k]["y0"] for k in range(len(lignes) - 1))
        pas = pas[len(pas) // 2] if pas else 0
        ecart = l["y0"] - lignes[li - 1]["y0"] if li > 0 else 0
        indente = (li > 0 and ((pas and ecart > pas * 1.22) or plain.lstrip().startswith("•")))
        retrait = li == 0 and l["x"] - x0 > 5
        if li == 0: premier_indente = retrait or plain.lstrip().startswith("•")
        if indente and cur and (li > 0):
            paras.append(" ".join(cur)); cur = []; prec = None
        if prec is not None and re.search(r"[a-zàâéèêîôûç]-\s*$", prec) and re.match(r"[a-zàâéèêîôûç]", plain):
            cur[-1] = re.sub(r"-\s*(</[a-z]+>)?\s*$", r"\1", cur[-1]) + txt_l
        else: cur.append(txt_l)
        prec = plain
    if cur: paras.append(" ".join(cur))
    paras = [re.sub(r"\s+", " ", p.replace("</em><em>", "").replace("</strong><strong>", "").replace("</em> <em>", " ").replace("</strong> <strong>", " ")).strip() for p in paras]
    return titre, [p for p in paras if p], premier_indente

def nettoyer_titre(t):
    return re.sub(r"\s+", " ", t.replace("\xa0", " ")).strip(" :")

par_page = []   # liste de (page_pdf, [événements])
for pn, p in enumerate(dump, 1):
    if pn in exclure: continue
    ev = []
    for b in ordre([b for b in p["blocks"] if not inutile(b)], p["w"]):
        titre, paras, indente = decouper(b)
        texte = " ".join(paras)
        s0 = b["lines"][0]["sp"][0]
        if titre:
            t = nettoyer_titre(("".join(x[0] for x in titre[:2]) + " " + " ".join(x[0] for x in titre[2:])) if len(titre[0][0].strip()) == 1 else " ".join(x[0] for x in titre))
            if titre[0][2].startswith("Killigrew"): ev.append(("h1", t))
            elif t.upper() == t and len(t) > 3: ev.append(("encadre", t))
            else: ev.append(("h2", t))
            ev += [("p", x) for x in paras]
        elif s0[2].startswith("WarnockPro-Bold") and s0[1] >= 12 and len(texte) < 90: ev.append(("h3", texte))
        elif s0[2].startswith("Infini"): ev.append(("h4", texte))
        else:
            for i, x in enumerate(paras): ev.append(("p", x, i == 0 and (not indente or bool(re.match(r"[a-zàâéèêîôûç]", re.sub(r"<[^>]+>", "", x))))))
    par_page.append((pn, ev))

GARDER = {"peut", "c'est", "est", "au", "là", "ci", "vis", "y", "dis", "moi", "toi", "lui", "eux", "nous", "vous", "tu", "il", "elle", "on", "ils", "elles", "je", "ce", "en", "t", "quelques", "grand", "demi", "mi", "sous", "porte", "contre", "arc", "avant", "après"}
def recoller(h):
    """« ath- létique » → « athlétique » (y compris autour d'une balise <em>) ; les vrais traits d'union (mots usuels) sont gardés."""
    def f(m):
        if m.group(1).lower() in GARDER: return m.group(0)
        return m.group(1) + (m.group(2) or "") + (m.group(3) or "") + m.group(4)
    h = re.sub(r"\b([A-ZÉÈ][a-zà-ÿ]{2,})- (?=[A-ZÉÈ])", r"\1-", h)   # « Terre- Boue » → « Terre-Boue »
    return re.sub(r"([a-zà-ÿ]{2,})-(</(?:em|strong)>)?\s*(<(?:em|strong)>)?([a-zà-ÿ]{2,})", f, h)

def rendre(evs):
    out = []; dernier = None
    for e in evs:
        k, t = e[0], e[1]; suite = len(e) > 2 and e[2]
        if k == "p":
            prev = re.sub(r"<[^>]+>", "", out[-1]) if dernier == "p" and out else ""
            plain = re.sub(r"<[^>]+>", "", t)
            if dernier == "p" and suite and not re.search(r"[.!?»:…)\]]\s*$", prev):
                out[-1] = out[-1][:-4] + " " + t + "</p>"
            else: out.append(f"<p>{t}</p>")
        elif k == "h2": out.append(f"<h2>{esc(t)}</h2>")
        elif k == "h3": out.append(f"<h3>{t}</h3>")
        elif k == "h4": out.append(f"<h4>{t}</h4>")
        elif k == "encadre": out.append(f'<h3 class="adc-encadre">{esc(t.capitalize())}</h3>')
        dernier = "p" if k == "p" else k
    return recoller("".join(out))

def couper(nom, h, maxi=30000):
    """Découpe un page trop longue aux intertitres <h2>."""
    if len(h) <= maxi * 1.3: return [(nom, h)]
    morceaux = re.split(r"(?=<h2>)", h); res, cur, k = [], "", 1
    for m in morceaux:
        if cur and len(cur) + len(m) > maxi: res.append(cur); cur = ""
        cur += m
    if cur: res.append(cur)
    out = []
    for i, c in enumerate(res, 1):
        t = re.match(r"<h2>(.*?)</h2>", c)
        out.append((f"{nom} — {t.group(1)}" if t and i > 1 else nom if i == 1 else f"{nom} (suite {i})", c))
    return out

journaux = []
for part in cfg.get("parties", [{"nom": "Livre", "de": 1, "a": len(dump)}]):
    pages, courant = [], {"name": part.get("intro", "Présentation"), "ev": []}
    for pn, ev in par_page:
        if not (part["de"] <= pn <= part["a"]): continue
        for e in ev:
            k, t = e[0], e[1]
            if k == "h1":
                if courant["ev"]: pages.append(courant)
                courant = {"name": re.sub(r"\s+", " ", t), "ev": []}
            else: courant["ev"].append(e)
    if courant["ev"]: pages.append(courant)
    liste = []
    for p in pages:
        if p["ev"]: liste += [{"name": n, "html": h} for n, h in couper(p["name"], rendre(p["ev"]))]
    journaux.append({"name": part["nom"], "pages": liste})
json.dump(journaux, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
print({j["name"]: [(p["name"], len(p["html"])) for p in j["pages"]] for j in journaux})
