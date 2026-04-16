'use strict';

module.exports = {
  createCurriculumResponse(curriculum) {
    return {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify(curriculum) }],
      usage: { input_tokens: 1000, output_tokens: 2000 },
    };
  },

  createScriptResponse(script, truncated = false) {
    return {
      stop_reason: truncated ? 'max_tokens' : 'end_turn',
      content: [{ type: 'text', text: script }],
      usage: { input_tokens: 800, output_tokens: 3000 },
    };
  },

  createWebSearchResponse(data) {
    return {
      stop_reason: 'end_turn',
      content: [
        { type: 'tool_use',    name: 'web_search', input: { query: 'test' } },
        { type: 'tool_result', content: [{ type: 'text', text: 'results' }] },
        { type: 'text',        text: JSON.stringify(data) },
      ],
      usage: { input_tokens: 1200, output_tokens: 900 },
    };
  },
};
