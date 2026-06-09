# Company-User Registration — What to Collect & When (for the dev team)

A **company** has many **users**; each user logs in (email + password). Collect data in 3 waves — don't ask for everything upfront.

## ✅ WAVE 1 — Collect at SIGN-UP (minimum to create the account)
The account can't exist without these.

| Field | Table | Notes |
|---|---|---|
| full_name | users | the person |
| email | users | login id (unique) |
| password | users | hash it (argon2id / Supabase Auth) — never plaintext |
| phone | users | optional but useful |
| role | users | `company_user` |
| company legal_name / brand_name | companies | the org |
| domain(s) | companies | renewable_energy / buildings / industrial |
| designation / role_in_company | company_users | admin / tech_scout / legal / finance |

## ⏳ WAVE 2 — Collect SOON after sign-up (needed for good matchmaking, not for login)
Prompt for these on first login / onboarding wizard.

| Field | Table | Why |
|---|---|---|
| sub_domains | companies | sharpens matches |
| hq_city / hq_state | companies | context |
| license_budget_band | companies | filters deal size |
| geographies (deployment) | companies / problems | field-of-use |
| **Problem Profile (problems)** | problems | **the key step — without problems, no matchmaking.** statement + sub_domain + urgency + target TRL band |

## 🔒 WAVE 3 — MANDATORY at a CERTAIN PROCESS (gate the step until provided)
Not needed early, but **block the relevant action** until filled.

| Field | Table | Gate it before… |
|---|---|---|
| gstin, cin, nic_code | companies | **KYC / deal room access** |
| is_verified (officer KYC) | companies | **deal room** — set by NRDC officer |
| can_sign_deals, spending_authority_inr | company_users | **signing a licensing deal** |
| dsir_recognized | companies | valuation / incentive eligibility |
| employee_count_band, annual_revenue_band | companies | company tiering / valuation (nice-to-have) |

## Rule of thumb
- **Wave 1** = can log in.
- **Wave 2** = can get matched.
- **Wave 3** = can transact (NDA → deal → payment).

Everything else in the schema is filled by the system or by NRDC officers, not the company at registration.
