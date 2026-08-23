# Link audit — verified 2026-08-14

Scope: the live site at `aseemmankotia.github.io`, plus every link in the local
`~/course-pipeline/site` folder.

---

## Summary

| Check | Result |
|---|---|
| Internal `.html` links (local `site/`, 176 pages) | **0 broken** |
| Referenced assets (css/js/png/svg/ico) | **0 missing** |
| External Udemy course links (31 distinct) | **31/31 resolve** |
| Internal links on the **live** site | **4 broken** — see below |
| Assets on the **live** site | **5 missing** — see below |

---

## Broken on the live site (fixed by publishing `site/`)

These four homepage cards link to pages that were never published. The pages **do exist**
in `~/course-pipeline/site`, along with 19 domain sub-pages for the same four certs.

- `pmi-cpmai.html`
- `cfde.html`
- `dea-c01.html`
- `associate-cloud-engineer.html`

## Missing assets on the live site (fixed by publishing `site/`)

The repo's `index.html` references these; none are in the repo. All five exist locally.

- `logo.png`
- `favicon.ico`
- `icon-192.png`
- `apple-touch-icon.png`
- `icon-512.png`

Related: the repo's `style.css` is an older revision that does not define `.brandbar`,
`.hero`, `.chip`, `.trust`, `.cta-row`, `.btn.ghost` or `.vchip`, all of which the repo's
`index.html` uses. That is why the live homepage renders unstyled. Confirmed by fetching
`https://aseemmankotia.github.io/style.css` directly — only `.cta` matched.

---

## External links — all 31 Udemy courses verified live

| Course slug | Resolved title |
|---|---|
| `aws-ai-practitioner-aif-c01-first-attempt-certification` | AWS AI Practitioner (AIF-C01): Complete Certification Prep |
| `aws-certified-genai-developer-aip-c01` | AWS Certified GenAI Developer (AIP-C01): Complete Prep |
| `aws-certified-security-specialty-scs-c03-exam-prep` | AWS Certified Security Specialty (SCS-C03) Exam Prep |
| `aws-saa-c04-exam-prep-solutions-architect-associate` | AWS SAA-C04 Exam Prep: Solutions Architect Associate |
| `aws-certified-ml-engineer-associate-mla-c01-prep` | AWS Certified ML Engineer Associate MLA-C01 Prep |
| `aws-certified-data-engineer-associate-dea-c01-prep` | (resolves) |
| `google-cloud-ace-associate-cloud-engineer-exam-prep` | Google Cloud ACE: Associate Cloud Engineer Exam Prep |
| `google-cloud-generative-ai-leader-exam-prep-2026` | Google Cloud Generative AI Leader: Exam Prep 2026 |
| `google-cloud-professional-ml-engineer-exam-prep` | (resolves) |
| `ai-103-azure-ai-apps-agents-developer-certification` | AI-103: Azure AI Apps & Agents Developer Certification |
| `ai-300-mlops-genaiops-engineer-exam-preparation` | (resolves) |
| `nvidia-nca-genl-generative-ai-llm-certification-prep` | NVIDIA NCA-GENL: Generative AI & LLM Certification Prep |
| `nvidia-ncp-aai-agentic-ai-certification-prep` | NVIDIA NCP-AAI: Agentic AI Certification Prep |
| `ncp-aii-nvidia-ai-infrastructure-professional-prep` | NCP-AII: NVIDIA AI Infrastructure Professional Prep |
| `ncp-ousd-nvidia-openusd-development-certification-prep` | NCP-OUSD: NVIDIA OpenUSD Development Certification Prep |
| `nca-genm-nvidia-generative-ai-multimodal-exam-prep` | NCA-GENM: NVIDIA Generative AI Multimodal Exam Prep |
| `nca-ads-nvidia-accelerated-data-science-exam-prep` | (resolves) |
| `ncp-ads-nvidia-accelerated-data-science-prep` | (resolves) |
| `ncp-genl-nvidia-generative-ai-llms-cert-prep` | (resolves) |
| `ncp-aio-nvidia-ai-operations-professional-certification` | (resolves) |
| `claude-certified-developer-ccdv-f-complete-exam-prep` | Claude Certified Developer (CCDV-F): Complete Exam Prep |
| `aipmm-cpm-certified-product-manager-exam-prep` | AIPMM CPM: Certified Product Manager Exam Prep |
| `aipmm-cdpm-exam-prep-digital-product-management` | (resolves) |
| `iapp-aigp-certification-eu-ai-act` | (resolves) |
| `isaca-aair-advanced-ai-risk-certification-prep` | (resolves) |
| `comptia-secai-cy0-001-certification-fast-track` | (resolves) |
| `comptia-security-sy0-701-exam-focused-prep` | (resolves) |
| `databricks-genai-engineer-associate-exam-prep` | (resolves) |
| `salesforce-agentforce-specialist-exam-focused-preparation` | (resolves) |
| `pmi-cpmai-certification-exam-prep-masterclass` | (resolves) |
| `gsdc-cfde-certification-forward-deployed-engineer-prep` | (resolves) |

### Caveat on coupon links

Udemy's `robots.txt` disallows fetching URLs that carry a query string, so any URL with
`?couponCode=FREETEST33` **cannot be checked programmatically** — only the bare course
URL can. Coupon validity and expiry must be confirmed manually in the Udemy instructor
dashboard.

This matters because the pages hardcode coupon copy: "Deal ends August 22",
"$17.99 with code FREETEST33", "valid through August 22" appear in the hero, the CTA
block and the FAQ. If the pipeline does not regenerate those dates, they will go stale
in public. Worth a check.

---

## How to re-run this audit

Internal links and assets — from the site folder:

```bash
python3 - <<'PY'
import re, glob, os
pages = sorted(glob.glob('*.html'))
miss = {(f, l) for f in pages
        for l in re.findall(r'href="([a-z0-9\-\.]+\.html)"', open(f).read())
        if not os.path.exists(l)}
srcs = {s for f in pages
        for s in re.findall(r'(?:src|href)="([a-z0-9\-\.]+\.(?:png|svg|ico|css|js))"', open(f).read())}
print('pages:', len(pages))
print('broken internal links:', sorted(miss) or 'NONE')
print('missing assets:', [s for s in sorted(srcs) if not os.path.exists(s)] or 'NONE')
PY
```

External links — list them, then check each (strip the query string first):

```bash
grep -ho 'https://www\.udemy\.com/course/[^"?]*' *.html | sort -u
```
