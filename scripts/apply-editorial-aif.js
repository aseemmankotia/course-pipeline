#!/usr/bin/env node
/**
 * apply-editorial-aif.js — One-time editorial pass for the AIF-C01 course.
 *
 * QA review (2026-07-13) found factual-currency issues in chapters generated
 * before the accuracy guardrails were added to generate-course.js:
 *   ch1: false "ten-minute minimum" SageMaker training billing claim → line fix
 *   ch3: stale Claude 2 / GPT-4-4096 refs + fabricated tokenization trivia → regenerate
 *   ch4: Claude 2 woven throughout + 1000× pricing error → regenerate
 *   ch6: volatile "minimum two OCUs" claim → softened
 *
 * Run AFTER course generation completes, then re-run:
 *   npm run generate:aif        (regenerates only ch3 + ch4, re-assembles)
 */

const fs = require('fs');
const path = require('path');

const STATE = path.join(__dirname, '..', 'generated', 'aws-certified-ai-practitioner-aif-c01', 'state.json');
const state = JSON.parse(fs.readFileSync(STATE, 'utf8'));

let changes = 0;

// ch1: remove false billing-minimum claim
const ch1Old = 'Exam note: Training jobs are billed per second with a ten-minute minimum.';
const ch1New = 'Exam note: Training jobs are billed per second only while they run.';
if (state.scripts['1'] && state.scripts['1'].includes(ch1Old)) {
  state.scripts['1'] = state.scripts['1'].replace(ch1Old, ch1New);
  changes++; console.log('✅ ch1: billing claim fixed');
}

// ch6: soften volatile OCU minimum claim
const ch6Old = 'Minimum: two OCUs for high availability.';
const ch6New = 'Production deployments with high availability typically run at least two OCUs; smaller dev configurations exist.';
if (state.scripts['6'] && state.scripts['6'].includes(ch6Old)) {
  state.scripts['6'] = state.scripts['6'].replace(ch6Old, ch6New);
  changes++; console.log('✅ ch6: OCU minimum softened');
}

// ch3 + ch4: force regeneration with the accuracy-hardened prompt
for (const n of ['3', '4']) {
  if (state.scripts[n]) {
    delete state.scripts[n];
    changes++; console.log(`✅ ch${n}: marked for regeneration`);
  }
}

fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
console.log(`\n${changes} changes applied. Now run:  npm run generate:aif`);
console.log('(Only chapters 3 and 4 will regenerate — everything else is checkpointed.)');
