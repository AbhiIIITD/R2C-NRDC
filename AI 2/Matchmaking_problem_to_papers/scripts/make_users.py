"""
Create one company-user login per company (12), password 'test1234' for all.
Writes data/users.json. (Loaded to Supabase by supabase/load_users.py)
Role in our schema = 'company_user' (wireframe calls this 'industry').
"""
import json, os, re, glob, hashlib

DATA = os.path.join(os.path.dirname(__file__), "..", "data")
TEST_PW = "test1234"
PW_HASH = "sha256$" + hashlib.sha256(TEST_PW.encode()).hexdigest()  # placeholder; prod -> argon2id/Supabase Auth

def slug(name):
    name = re.split(r'\(', name)[0]
    for w in ["Ltd", "Pvt", "Limited", "Developers", "Scientific", "Systems",
              "International", "Solutions", "Materials", "Technologies", "Lifespaces"]:
        name = name.replace(w, "")
    return re.sub(r'[^a-z0-9]', '', name.lower())[:20]

users = []
for fp in sorted(glob.glob(os.path.join(DATA, "companies", "*.json"))):
    c = json.load(open(fp, encoding="utf-8"))
    s = slug(c["company_name"])
    users.append({
        "user_ref": f"USR-{c['company_id_local']}",
        "company_id_local": c["company_id_local"],
        "company_name": c["company_name"],
        "full_name": f"{c['company_name'].split('(')[0].strip()} Tech Scout",
        "email": f"{s}@r2c.test",
        "username": s,
        "role": "company_user",            # our schema enum (wireframe: 'industry')
        "role_in_company": "admin",        # demo: full rights
        "can_sign_deals": True,
        "password_plain": TEST_PW,         # for the team's reference (all the same)
        "password_hash": PW_HASH,
    })

json.dump(users, open(os.path.join(DATA, "users.json"), "w", encoding="utf-8"), indent=2, ensure_ascii=False)
print(f"wrote {len(users)} company users (password '{TEST_PW}' for all) -> data/users.json")
for u in users:
    print(f"  {u['email']:<26}{u['company_name']}")
