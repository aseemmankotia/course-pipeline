import json, csv, os, math
COURSES = {
  'aws-certified-ai-practitioner-aif-c01': 'aif',
  'salesforce-agentforce-specialist': 'agentforce',
  'anthropic-claude-developer-foundations': 'ccdvf',
  'comptia-secai-plus-cy0-001': 'secai',
  'aws-genai-developer-aip-c01': 'aip',
  'ai-901-azure-ai-fundamentals-refresh-2026': 'ai901',
  'az-900-azure-fundamentals-refresh-2026': 'az900',
  'nvidia-nca-aiio-refresh-2026': 'aiio',
  'microsoft-ai-103-azure-ai-apps-agents-2026': 'ai103',
  # 'nvidia-ncp-aio-ai-operations-2026': 'ncpaio',  # uncomment after generation (script crashes on missing state.json)
}
# Paths are repo-relative (derived from this script's location) so the script
# runs on any machine — a previous session had hardcoded its own sandbox mount.
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'exports', 'practice-test-csvs')
os.makedirs(OUT, exist_ok=True)
HDR = ['Question','Question Type','Answer Option 1','Explanation 1','Answer Option 2','Explanation 2','Answer Option 3','Explanation 3','Answer Option 4','Explanation 4','Answer Option 5','Explanation 5','Answer Option 6','Explanation 6','Correct Answers','Overall Explanation','Domain']
summary=[]
for slug, short in COURSES.items():
    state = json.load(open(os.path.join(ROOT, 'generated', slug, 'state.json')))
    tests = {1: [], 2: []}
    for key, qs in (state.get('tests') or {}).items():
        n = 1 if key.startswith('t1') else 2
        for q in qs or []:
            tests[n].append(q)
    for n in (1,2):
        qs = tests[n]
        if not qs: continue
        path = f'{OUT}/{short}-test{n}.csv'
        bad = 0
        with open(path,'w',newline='',encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(HDR)
            for q in qs:
                opts = q.get('options') or []
                ci = q.get('correct_index')
                if len(opts)!=4 or not isinstance(ci,int) or not (0<=ci<=3):
                    bad += 1; continue
                # Per-option explanations: the correct option carries why_correct;
                # wrong options carry why_others_wrong in display order (balance-answers
                # keeps each distractor's explanation travelling with its option text).
                why_correct = (q.get('why_correct') or '').strip()
                wrong = [str(x).strip() for x in (q.get('why_others_wrong') or [])]
                row = [q.get('question','').strip(), 'multiple-choice']
                wi = 0
                for i, o in enumerate(opts):
                    if i == ci:
                        expl = why_correct
                    else:
                        expl = wrong[wi] if wi < len(wrong) else ''
                        wi += 1
                    row += [str(o).strip(), expl]
                row += ['','','','']  # options 5,6 empty
                overall = (q.get('explanation') or '').strip() or why_correct
                row += [str(ci+1), overall, (q.get('domain') or '').strip()]
                w.writerow(row)
        dur = int(math.ceil(len(qs)*1.4/5)*5)
        summary.append(f'{short}-test{n}.csv: {len(qs)-bad} questions (skipped {bad}), suggested duration {dur} min')
print('\n'.join(summary))
