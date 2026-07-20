import json, csv, os, math
COURSES = {
  'aws-certified-ai-practitioner-aif-c01': 'aif',
  'comptia-secai-plus-cy0-001': 'secai',
  'aws-genai-developer-aip-c01': 'aip',
}
OUT = '/sessions/sharp-wonderful-rubin/mnt/course-pipeline/exports/practice-test-csvs'
os.makedirs(OUT, exist_ok=True)
HDR = ['Question','Question Type','Answer Option 1','Explanation 1','Answer Option 2','Explanation 2','Answer Option 3','Explanation 3','Answer Option 4','Explanation 4','Answer Option 5','Explanation 5','Answer Option 6','Explanation 6','Correct Answers','Overall Explanation','Domain']
summary=[]
for slug, short in COURSES.items():
    state = json.load(open(f'/sessions/sharp-wonderful-rubin/mnt/course-pipeline/generated/{slug}/state.json'))
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
                row = [q.get('question','').strip(), 'multiple-choice']
                for o in opts: row += [str(o).strip(), '']
                row += ['','','','']  # options 5,6 empty
                row += [str(ci+1), (q.get('explanation') or '').strip(), (q.get('domain') or '').strip()]
                w.writerow(row)
        dur = int(math.ceil(len(qs)*1.4/5)*5)
        summary.append(f'{short}-test{n}.csv: {len(qs)-bad} questions (skipped {bad}), suggested duration {dur} min')
print('\n'.join(summary))
