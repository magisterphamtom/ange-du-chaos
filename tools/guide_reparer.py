"""Corrige les journaux produits par guide_en_journaux.py : titres d'encadrés (noms de PNJ en capitales) tombés au milieu d'un
paragraphe, césures dans les titres, noms de pages en cascade.
Usage : python3 tools/guide_reparer.py entree.json sortie.json"""
import json, re, sys, html as H

def txt(el): return H.unescape(re.sub(r"<[^>]+>", "", el)).strip()
def elements(h): return re.findall(r"<(?:p|h2|h3|h4)[^>]*>.*?</(?:p|h2|h3|h4)>", h, flags=re.S)
FIN = re.compile(r"[.!?…:»)\]”\"]$")

def reparer(h):
    els = elements(h); i = 0; deplaces = 0
    while i < len(els):
        e = els[i]
        if e.startswith('<h3 class="adcencadre"') and 0 < i < len(els) - 1:
            prev, nxt = els[i - 1], els[i + 1]
            if prev.startswith("<p>") and nxt.startswith("<p>") and not FIN.search(txt(prev)) and re.match(r"[a-zàâçéèêëîïôûùü]", txt(nxt)):
                fusion = prev[:-4] + " " + nxt[3:]
                nom = txt(e).lower()
                els[i - 1:i + 2] = [fusion]          # le titre est retiré, les deux morceaux fusionnent
                # le titre se replace devant le paragraphe qui commence par son nom (texte de l'encadré)
                cible = next((j for j in range(i, min(len(els), i + 10)) if els[j].startswith("<p>") and txt(els[j]).lower().startswith(nom[:10])), None)
                els.insert(cible if cible is not None else i, e)
                deplaces += 1
                continue
        i += 1
    return "".join(els), deplaces

def titre(n):
    n = re.sub(r"([a-zàâçéèêëîïôûù])- ([a-zàâçéèêëîïôûù])", r"\1\2", n)
    return n.split(" — ")[-1].strip() if " — " in n else n

if __name__ == "__main__":
    d = json.load(open(sys.argv[1])); tot = 0
    for j in d:
        for p in j["pages"]:
            p["html"], n = reparer(p["html"]); tot += n
            p["name"] = titre(p["name"])
    json.dump(d, open(sys.argv[2], "w"), ensure_ascii=False)
    print("encadrés replacés :", tot)
