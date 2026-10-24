import pymupdf as fitz, json, sys
pdf, out = sys.argv[1], sys.argv[2]
d = fitz.open(pdf)
fl = fitz.TEXTFLAGS_DICT & ~fitz.TEXT_PRESERVE_IMAGES
res = []
for pn in range(len(d)):
    p = d[pn]; blocks = []
    for b in p.get_text("dict", flags=fl)["blocks"]:
        if b['type'] != 0: continue
        lines = []
        for l in b['lines']:
            spans = [(s['text'], round(s['size'], 1), s['font'], s['flags']) for s in l['spans'] if s['text']]
            if spans: lines.append({'x': round(l['bbox'][0]), 'x1': round(l['bbox'][2]), 'y0': round(l['bbox'][1],1), 'y1': round(l['bbox'][3],1), 'sp': spans})
        if lines: blocks.append({"bbox": [round(x) for x in b['bbox']], "lines": lines})
    res.append({"w": round(p.rect.width), "blocks": blocks})
json.dump(res, open(out, 'w'), ensure_ascii=False)
print(len(res))
