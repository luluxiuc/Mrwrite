'use client';
import { useEffect, useState } from 'react';
import { Sparkles, GitBranch, FileText, Wand2, CheckCircle, PenLine, Zap } from 'lucide-react';

interface SkillInfo { name: string; description: string; phase: string; tags: string[]; }
interface SkillBarProps {
  onSkillSelect: (skillName: string) => void;
  selectedText: string;
  autoSkills?: string[];
}

const SKILL_ICONS: Record<string, React.ReactNode> = {
  humanizer: <Sparkles size={16} />,
  'outline-generator': <GitBranch size={16} />,
  'chapter-manager': <FileText size={16} />,
  'style-transfer': <Wand2 size={16} />,
  'continuity-checker': <CheckCircle size={16} />,
  'quality-gate': <PenLine size={16} />,
};

const SKILL_LABELS: Record<string, string> = {
  humanizer: '去 AI 味',
  'outline-generator': '生成大纲',
  'chapter-manager': '章节管理',
  'style-transfer': '风格迁移',
  'continuity-checker': '一致性检查',
  'quality-gate': '质量门禁',
};

export function SkillBar({ onSkillSelect, selectedText, autoSkills = [] }: SkillBarProps) {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/skills')
      .then(r => r.json()).then(setSkills)
      .catch(() => setSkills([
        { name: 'humanizer', description: '去 AI 味', phase: 'polishing', tags: ['de-ai'] },
        { name: 'outline-generator', description: '生成大纲', phase: 'pre-writing', tags: ['planning'] },
      ]));
  }, []);

  const grouped = skills.reduce<Record<string, SkillInfo[]>>((acc, skill) => {
    (acc[skill.phase] ??= []).push(skill);
    return acc;
  }, {} as Record<string, SkillInfo[]>);

  const phaseLabels: Record<string, string> = {
    'pre-writing': '构思', drafting: '写作', editing: '编辑', polishing: '润色', export: '导出',
  };

  return (
    <div className="flex flex-col py-3">
      <div className="px-4 mb-2">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Skills</span>
      </div>
      {Object.entries(grouped).map(([phase, phaseSkills]) => (
        <div key={phase} className="mb-3">
          <div className="px-4 py-1 text-[10px] font-medium text-text-muted uppercase tracking-wider">
            {phaseLabels[phase] || phase}
          </div>
          {phaseSkills.map((skill) => {
            const isAuto = autoSkills.includes(skill.name);
            const isActive = activeSkill === skill.name;
            const label = SKILL_LABELS[skill.name] || skill.name;
            const icon = SKILL_ICONS[skill.name] || <Wand2 size={16} />;

            return (
              <button
                key={skill.name}
                onClick={() => { setActiveSkill(skill.name); onSkillSelect(skill.name); }}
                disabled={!selectedText && !isAuto}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all text-[13px] group relative ${
                  isActive
                    ? 'bg-accent-subtle text-accent border-r-[3px] border-accent'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                } ${!selectedText && !isAuto ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                <span className={`shrink-0 ${isAuto ? 'text-accent' : isActive ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary'} transition-colors`}>
                  {icon}
                </span>
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium truncate flex items-center gap-2">
                    {label}
                    {isAuto && (
                      <span className="shrink-0 flex items-center gap-0.5 text-[9px] text-accent bg-accent-subtle px-1.5 py-0.5 rounded-full">
                        <Zap size={9} /> AUTO
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-text-muted truncate font-normal">{skill.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
