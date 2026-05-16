'use client';
import { useEffect, useState } from 'react';
import { PenLine, Wand2, Sparkles, FileText, CheckCircle, GitBranch } from 'lucide-react';

interface SkillInfo {
  name: string;
  description: string;
  phase: string;
  tags: string[];
}

interface SkillBarProps {
  onSkillSelect: (skillName: string) => void;
  selectedText: string;
}

const SKILL_ICONS: Record<string, React.ReactNode> = {
  humanizer: <Sparkles size={20} />,
  'outline-generator': <GitBranch size={20} />,
  'chapter-manager': <FileText size={20} />,
  'style-transfer': <Wand2 size={20} />,
  'continuity-checker': <CheckCircle size={20} />,
  'quality-gate': <PenLine size={20} />,
};

export function SkillBar({ onSkillSelect, selectedText }: SkillBarProps) {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/skills')
      .then((r) => r.json())
      .then(setSkills)
      .catch(() => {
        setSkills([
          { name: 'humanizer', description: '去 AI 味', phase: 'polishing', tags: ['de-ai'] },
          { name: 'outline-generator', description: '生成大纲', phase: 'pre-writing', tags: ['planning'] },
        ]);
      });
  }, []);

  const grouped = skills.reduce<Record<string, SkillInfo[]>>((acc, skill) => {
    const phase = skill.phase || 'other';
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(skill);
    return acc;
  }, {});

  const phaseLabels: Record<string, string> = {
    'pre-writing': '构思',
    drafting: '写作',
    editing: '编辑',
    polishing: '润色',
    export: '导出',
    other: '其他',
  };

  return (
    <div className="flex flex-col py-2">
      <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">技能</div>
      {Object.entries(grouped).map(([phase, phaseSkills]) => (
        <div key={phase} className="mb-2">
          <div className="px-3 py-1 text-[10px] text-gray-600 uppercase">{phaseLabels[phase] || phase}</div>
          {phaseSkills.map((skill) => (
            <button
              key={skill.name}
              onClick={() => { setActiveSkill(skill.name); onSkillSelect(skill.name); }}
              disabled={!selectedText}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors text-sm ${activeSkill === skill.name ? 'bg-accent/20 text-accent border-r-2 border-accent' : 'text-gray-400 hover:bg-bg hover:text-gray-200'} ${!selectedText ? 'opacity-40 cursor-not-allowed' : ''}`}
              title={skill.description}
            >
              <span className="shrink-0">{SKILL_ICONS[skill.name] || <Wand2 size={20} />}</span>
              <div className="overflow-hidden">
                <div className="font-medium truncate">{skill.name}</div>
                <div className="text-[10px] text-gray-600 truncate">{skill.description}</div>
              </div>
            </button>
          ))}
        </div>
      ))}
      {!selectedText && (
        <div className="px-3 py-2 mt-1 text-[11px] text-gray-600 text-center">选中文字以使用技能</div>
      )}
    </div>
  );
}
