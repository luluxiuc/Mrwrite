import type { SkillExecuteRequest, SkillExecuteResult } from '../../types';
import patterns from './patterns.json';

function detectAIPatterns(text: string): { name: string; count: number }[] {
  const results: { name: string; count: number }[] = [];

  for (const p of patterns.patterns) {
    try {
      const matches = text.match(new RegExp(p.pattern, 'g'));
      if (matches && matches.length > 0) {
        results.push({ name: p.name, count: matches.length });
      }
    } catch {
      // Skip invalid patterns
    }
  }

  return results.sort((a, b) => b.count - a.count);
}

function calculateAIScore(text: string): number {
  const detections = detectAIPatterns(text);
  if (detections.length === 0) return 90;

  let penalty = 0;
  for (const d of detections) {
    const pattern = patterns.patterns.find((p) => p.name === d.name);
    penalty += d.count * (pattern?.weight || 1);
  }

  return Math.max(0, Math.min(100, 100 - penalty));
}

export default {
  execute: async (req: SkillExecuteRequest): Promise<SkillExecuteResult> => {
    const inputScore = calculateAIScore(req.input);
    const detections = detectAIPatterns(req.input);

    return {
      output: req.input,
      score: inputScore,
      warnings: detections.map(
        (d) => `Detected '${d.name}' pattern ${d.count} times`
      ),
    };
  },
};
