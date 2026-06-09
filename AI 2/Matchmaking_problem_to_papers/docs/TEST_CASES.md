# Testing the Matchmaking API (`POST /match`)

Open **http://127.0.0.1:8004/docs** → `POST /match` → **Try it out** → paste a body → **Execute**.

## ⚠️ Use ONLY ONE field per request
The Swagger default shows both `problem_ref` and `problem_statement` as `"string"`.
The API checks `problem_ref` first — so **delete the field you're not using**, or you'll get 0 results.

- `problem_ref`  → for a **saved** problem (uses its stored embedding; fast).
- `problem_statement` → for **new typed** text (embeds it live).

---

## A. Saved problems (by `problem_ref`)
| Paste this body | Expect #1 |
|---|---|
| `{ "problem_ref": "PROB-NT-02", "top_n": 5 }` | RE-09 (PEM membrane degradation) |
| `{ "problem_ref": "PROB-DT-01", "top_n": 5 }` | IN-07 (pipeline leak localization) |
| `{ "problem_ref": "PROB-UTC-01", "top_n": 5 }` | BL-02 (geopolymer strength/CO2) |
| `{ "problem_ref": "PROB-VS-02", "top_n": 5 }` | RE-08 (conductive paste / silver) |

(All refs: PROB-VS-01, PROB-VS-02, PROB-NT-01, PROB-NT-02, PROB-LOG9-01, PROB-UTC-01, PROB-CCS-01, PROB-DT-01, PROB-TS-01)

## B. New typed problems (by `problem_statement`)
| Paste this body | Expect #1 |
|---|---|
| `{ "problem_statement": "reduce silver paste cost in solar cells", "top_n": 5 }` | RE-08 |
| `{ "problem_statement": "capture CO2 from cement flue gas with low energy", "top_n": 5 }` | BL-12 / BL-13 |
| `{ "problem_statement": "make green steel using hydrogen instead of coke", "top_n": 5 }` | IN-01 / IN-02 |
| `{ "problem_statement": "membrane-less electrolyser to cut hydrogen cost", "top_n": 5 }` | RE-11 / RE-14 |
| `{ "problem_statement": "predict battery degradation and improve fast charging", "top_n": 5 }` | RE-19 |

## C. Edge cases (what "no good match" looks like)
| Paste this body | Expect |
|---|---|
| `{ "problem_statement": "AI for predictive maintenance of factory machines", "top_n": 5 }` | IN-11 / IN-13 (fuzzier, still right area) |
| `{ "problem_statement": "blockchain for supply chain payments", "top_n": 5 }` | all **low** cosine (~0.2–0.4) — no relevant paper in corpus |

## D. With AI explanation (needs `ANTHROPIC_API_KEY` in `.env`)
```json
{ "problem_ref": "PROB-TS-01", "top_n": 3, "explain": true }
```
→ adds a one-line "why it fits" per paper. Without the key, you still get ranked matches.

## How to read the result
- `matches[].cosine` = semantic closeness (1 = identical meaning). Strong match ≈ 0.6–0.8.
- `cosine` is only the *semantic* dimension; production adds TRL/sub-domain/recency + LLM rerank.
