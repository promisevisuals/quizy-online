"""Label every Sports Arena question with a sport (topic) and, for football, a time period and team,
and add the new questions from sports-questions.py. Safe to run more than once."""
import json, pathlib, runpy

ROOT = pathlib.Path(__file__).resolve().parent.parent
BANK = ROOT / "src/data/bank.json"
NEW = runpy.run_path(str(ROOT / "scripts/sports-questions.py"))["Q"]

# existing questions: base id -> (topic, tags)
RULES = ("football", ["era:rules"])
EXISTING = {
    "1": RULES, "2": RULES, "5": RULES, "7": RULES, "9": RULES, "10": RULES, "14": RULES, "15": RULES,
    "extra-3": RULES, "extra-5": RULES, "extra-7": RULES, "advanced-1": RULES,
    "3": ("more", []), "8": ("more", []), "extra-2": ("more", []), "advanced-2": ("more", []), "advanced-8": ("more", []),
    "4": ("olympics", []),
    "6": ("tennis", []), "13": ("tennis", []), "advanced-6": ("tennis", []),
    "12": ("basketball", []), "extra-1": ("basketball", []), "advanced-4": ("basketball", []),
    "extra-4": ("athletics", []), "extra-6": ("athletics", []), "extra-8": ("athletics", []),
    "advanced-3": ("athletics", []), "advanced-5": ("athletics", []), "advanced-7": ("athletics", []),
    "advanced-9": ("athletics", []), "advanced-10": ("athletics", []),
    "11": ("more", []), "extra-9": ("more", []), "extra-10": ("more", []),
    "16": ("football", ["era:2020s", "team:arsenal"]), "17": ("football", ["era:2020s"]),
    "18": ("football", ["era:2020s", "team:liverpool"]), "19": ("football", ["era:2020s", "team:barcelona"]),
    "20": ("football", ["era:2020s"]),
}

def base_id(qid: str) -> str:
    if qid.startswith("advanced-sports-"):
        return "advanced-" + qid.split("-")[-1]
    for prefix in ("sports-8-", "sports-"):
        if qid.startswith(prefix):
            return qid[len(prefix):]
    return qid

bank = json.loads(BANK.read_text())
land = next(l for l in bank["lands"] if l["id"] == "sports")
kept = [q for q in land["questions"] if not q["id"].startswith("sports-new-")]
missing = []
for q in kept:
    tag = EXISTING.get(base_id(q["id"]))
    if not tag:
        missing.append(q["id"])
        continue
    q["topic"], q["tags"] = tag[0], list(tag[1])
assert not missing, f"untagged: {missing}"

for qid, topic, tags, level, text, opts, exp in NEW:
    assert len(opts) == 4 and len(set(opts)) == 4, qid
    kept.append({
        "kind": "choice", "id": f"sports-new-{qid}", "q": text, "opts": opts, "a": 0, "exp": exp,
        "difficulty": level, "age8": True, "replace": False, "topic": topic,
        "tags": [t for t in tags if t != "era:any" and t != "olympics"],
    })
    # Olympic football and athletics also appear under Olympics
    if "olympics" in tags:
        kept[-1]["also"] = ["olympics"]

land["questions"] = kept
BANK.write_text(json.dumps(bank, ensure_ascii=False, separators=(",", ":")))
print("sports questions:", len(kept), "new:", len(NEW))
