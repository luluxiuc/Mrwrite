import { NextRequest } from 'next/server';

const AUTO_SKILL_RULES: Record<string, { patterns: RegExp[]; threshold: number }> = {
  humanizer: {
    patterns: [
      /首先.*其次|此外|总之|值得注意的是|不可否认|毋庸置疑|众所周知/g,
      /在当今|随着.*的发展|在这个.*的时代/g,
      /不仅.*而且|既.*又|一方面.*另一方面/g,
      /进行.{2,4}|予以.{2,4}|加以.{2,4}/g,
    ],
    threshold: 3,
  },
  'quality-gate': {
    patterns: [
      /.{200,}/g, // Long text benefits from quality check
    ],
    threshold: 1,
  },
};

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) return Response.json({ skills: [] });

  const detectedSkills: string[] = [];

  for (const [skillName, rule] of Object.entries(AUTO_SKILL_RULES)) {
    let matches = 0;
    for (const pattern of rule.patterns) {
      const found = text.match(pattern);
      if (found) matches += found.length;
    }
    if (matches >= rule.threshold) {
      detectedSkills.push(skillName);
    }
  }

  // Humanizer is default — always suggest it for any text
  if (!detectedSkills.includes('humanizer') && text.length > 200) {
    detectedSkills.push('humanizer');
  }

  return Response.json({ skills: detectedSkills });
}
