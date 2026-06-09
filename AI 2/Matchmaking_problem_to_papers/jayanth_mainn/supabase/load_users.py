"""Load the 12 company-user logins into Supabase (users + company_users)."""
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from load import db_params
import psycopg2

DATA = os.path.join(os.path.dirname(__file__), "..", "data")
conn = psycopg2.connect(**db_params()); conn.autocommit = False; cur = conn.cursor()

# map company_id_local -> company_id uuid
cur.execute("select company_id_local, company_id from companies")
comp = dict(cur.fetchall())

n = 0
for u in json.load(open(os.path.join(DATA, "users.json"), encoding="utf-8")):
    cur.execute("""insert into users (email, full_name, role, password_hash, is_email_verified, is_active)
        values (%s,%s,%s,%s,true,true)
        on conflict (email) do update set full_name=excluded.full_name
        returning user_id""",
        (u["email"], u["full_name"], u["role"], u["password_hash"]))
    uid = cur.fetchone()[0]
    cid = comp.get(u["company_id_local"])
    if cid:
        cur.execute("""insert into company_users (user_id, company_id, role_in_company, can_sign_deals)
            values (%s,%s,%s,%s)
            on conflict (user_id, company_id) do update set role_in_company=excluded.role_in_company""",
            (uid, cid, u["role_in_company"], u["can_sign_deals"]))
    n += 1

conn.commit()
cur.execute("select count(*) from users"); nu = cur.fetchone()[0]
cur.execute("select count(*) from company_users"); ncu = cur.fetchone()[0]
cur.close(); conn.close()
print(f"loaded {n} company logins | users table: {nu} | company_users links: {ncu}")
print("test password for ALL: test1234")
