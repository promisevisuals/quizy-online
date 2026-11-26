"""Builds src/data/bible.json for King's Bible Quest from part1-4."""
import json, random, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import part1, part2, part3, part4  # noqa: registers lands in order
from part1 import LANDS

ORDER = ["creation","patriarchs","exodus","kings","prophets","psalms","jesus","miracles",
         "parables","cross","church","women","whosaid","books","verses","animals"]
BREAKS = [
 ("know","Did you know? About 40 different people wrote the Bible.","They wrote over roughly 1,500 years, yet it tells one story."),
 ("know","Did you know? Psalm 117 is the shortest chapter in the Bible.","It has just two verses. Psalm 119, with 176 verses, is the longest."),
 ("know","Did you know? Methuselah lived 969 years!","That is the longest life recorded in the Bible. (Genesis 5:27)"),
 ("know","Did you know? “Jesus wept” is the shortest verse in the King James Bible.","It is John 11:35, when Jesus came to Lazarus' tomb."),
 ("know","Did you know? “Gospel” means “good news”.","Matthew, Mark, Luke and John tell the good news of Jesus."),
 ("know","Did you know? Jesus spoke Aramaic.","“Talitha cumi” means “Little girl, arise”. (Mark 5:41)"),
 ("know","Did you know? The Old Testament was written mostly in Hebrew.","The New Testament was written in Greek."),
 ("know","Did you know? The Bible has 1,189 chapters.","929 in the Old Testament and 260 in the New Testament."),
 ("know","Did you know? Paul wrote some letters from prison.","Ephesians, Philippians, Colossians and Philemon are called the prison letters."),
 ("know","Did you know? Noah's ark was about 300 cubits long.","That is roughly 135 metres, longer than a football pitch! (Genesis 6:15)"),
 ("riddle","I was inside a fish for three days and three nights. Who am I?","Jonah (Jonah 1:17)"),
 ("riddle","I wore a coat of many colours and became a ruler in Egypt. Who am I?","Joseph (Genesis 37, 41)"),
 ("riddle","I spent a night with lions and woke up safe. Who am I?","Daniel (Daniel 6)"),
 ("riddle","I was short, so I climbed a sycamore tree to see Jesus. Who am I?","Zacchaeus (Luke 19)"),
 ("riddle","I fell from the sky each morning and tasted like wafers with honey. What am I?","Manna (Exodus 16:31)"),
 ("riddle","I was a shepherd boy who beat a giant with one stone. Who am I?","David (1 Samuel 17)"),
 ("riddle","I built a huge boat before any rain came. Who am I?","Noah (Genesis 6)"),
 ("riddle","I stood still in the sky so Joshua could win a battle. What am I?","The sun (Joshua 10:13)"),
]

def build():
    by = {l["id"]: l for l in LANDS}
    assert sorted(by) == sorted(ORDER), (sorted(by), ORDER)
    rng = random.Random(7)
    lands = []
    for lid in ORDER:
        l = by[lid]; qs = []; seen = set()
        for group, age8 in (("kids", False), ("adults", True)):
            for i, (diff, q, opts, exp) in enumerate(l[group], 1):
                assert diff in ("easy","medium","difficult","advanced"), q
                assert len(opts) == 4 and len(set(opts)) == 4, q
                assert q not in seen, q; seen.add(q)
                right = opts[0]; o = opts[:]; rng.shuffle(o)
                qs.append(dict(kind="choice", id=f"{lid}-{'k' if not age8 else 'g'}{i}", q=q, opts=o,
                               a=o.index(right), exp=exp, difficulty=diff, age8=age8, replace=False))
        lands.append(dict(id=lid, name=l["name"], mode="choice", count=10, questions=qs))
    return dict(lands=lands, academy=[], breaks=[dict(type=t, text=x, answer=a) for t, x, a in BREAKS]), {l["id"]: l["blurb"] for l in LANDS}

if __name__ == "__main__":
    bank, blurbs = build()
    json.dump(bank, open("src/data/bible.json", "w"), ensure_ascii=False, indent=1)
    json.dump(blurbs, open("src/data/bible-blurbs.json", "w"), ensure_ascii=False, indent=1)
    n = sum(len(l["questions"]) for l in bank["lands"])
    for l in bank["lands"]:
        k = sum(not q["age8"] for q in l["questions"]); print(f'{l["id"]:11} kids {k:2}  grown-ups {len(l["questions"])-k:2}')
    print("total", n)
