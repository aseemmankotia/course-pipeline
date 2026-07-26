# New course generation runbook — AI-103 + NCP-AIO (week of 2026-07-27)

Two new configs are committed and ready. Generation runs on your Mac (sandbox can't
reach the Anthropic API). Both blueprints were verified against official sources on
2026-07-26.

## The two courses

**1. Microsoft AI-103 — Azure AI Apps and Agents Developer Associate**
- Slug: `microsoft-ai-103-azure-ai-apps-agents-2026`
- Successor to retired AI-102; flagship of Microsoft's 2026 AI cert wave.
- Official domains (verbatim from MS study guide, skills as of 2026-04-16):
  Plan/manage Azure AI solution 25-30% · GenAI + agentic solutions 30-35% ·
  Computer vision 10-15% · Text analysis 10-15% · Information extraction 10-15%
- 10 chapters, Intermediate, funnel from AI-901/AZ-900 students.

**2. NVIDIA NCP-AIO — Certified Professional AI Operations**
- Slug: `nvidia-ncp-aio-ai-operations-2026`
- Professional follow-on to NCA-AIIO. Udemy competitors are practice-test packs
  only — full video course is the differentiator.
- Official blueprint: Installation & Deployment 31% · Administration 23% ·
  Workload Management 23% · Troubleshooting & Optimization 23%
- Exam is 30 MCQ + 3 hands-on labs in one 120-min session ($500, pass/fail) —
  course is built to drill CLI fluency (BCM, Slurm, K8s, Run:ai, MIG, DCGM).
- 9 chapters, Advanced.

## Commands (run on your Mac, one at a time)

```bash
cd ~/course-pipeline
git pull   # if needed

node scripts/autopilot.js --only=microsoft-ai-103-azure-ai-apps-agents-2026
node scripts/autopilot.js --only=nvidia-ncp-aio-ai-operations-2026
```

Autopilot handles curriculum → scripts → materials → tests → QA → assemble → promo.
Use --only exactly as above (running bare autopilot regenerates nothing else, but
--only keeps token spend scoped).

## After generation — checklist (I can do all of this once you say generation finished)

1. **Vendor-term scan on NCP-AIO tests** (CLAUDE.md rule 4): grep the question bank
   for AWS/Azure/GCP terms before any upload.
2. QA verdicts: fix any short chapters (expand-short-chapter.js) and re-assemble.
3. Add the two slugs to `scripts/make-practice-test-csvs.py` COURSES map
   (short codes: `ai103`, `ncpaio`) — do NOT add before generation, the script
   crashes on missing state.json.
4. Render videos + package exports on your Mac, then create the two Udemy courses
   via /instructor/courses/ (never course/create/1), upload videos via Bulk Uploader.
5. I build curriculum/tests/landing pages in the browser (same swap pattern),
   with AI disclosure + text-free course images (I'll generate 750x422 no-text cards).
6. After Udemy URLs exist: add both to promo-all.js registry, render promos,
   YouTube Shorts on your go.
7. Pricing suggestion at publish: AI-103 premium ($199.99 tier, dev audience);
   NCP-AIO premium ($199.99, $500 exam means high willingness to pay).

## Sources
- AI-103 study guide: https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ai-103
- NCP-AIO cert page + blueprint: https://www.nvidia.com/en-us/learn/certification/ai-operations-professional/
