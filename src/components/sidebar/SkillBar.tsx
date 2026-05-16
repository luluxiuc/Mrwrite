'use client';
import { useEffect, useState } from 'react';
import { Sparkles, GitBranch, FileText, Wand2, CheckCircle, PenLine, Zap, X, ArrowRight } from 'lucide-react';

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

const SKILL_DESCRIPTIONS: Record<string, string> = {
  humanizer: '检测并去除 AI 写作痕迹，让文字更自然、更有「人味」',
  'outline-generator': '根据主题或已有内容自动生成层级化写作大纲',
  'chapter-manager': '管理长文章节结构，追踪剧情/论点一致性',
  'style-transfer': '学习并模仿特定写作文风',
  'continuity-checker': '检查前后文一致性（人物、时间线、情节、设定）',
  'quality-gate': '多维度写作质量评估，不通过自动触发重写建议',
};

export function SkillBar({ onSkillSelect, selectedText, autoSkills = [] }: SkillBarProps) {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [confirmSkill, setConfirmSkill] = useState<{ name: string; label: string; desc: string } | null>(null);

  useEffect(() => {
    fetch('/api/skills')
      .then(r => r.json()).then(setSkills)
      .catch(() => setSkills([]));
  }, []);

  const handleSkillClick = (skillName: string) => {
    const label = SKILL_LABELS[skillName] || skillName;
    const desc = SKILL_DESCRIPTIONS[skillName] || '';
    setConfirmSkill({ name: skillName, label, desc });
  };

  const handleConfirm = () => {
    if (confirmSkill) {
      onSkillSelect(confirmSkill.name);
      setConfirmSkill(null);
    }
  };

  const handleCancel = () => {
    setConfirmSkill(null);
  };

  const grouped = skills.reduce<Record<string, SkillInfo[]>>((acc, skill) => {
    (acc[skill.phase] ??= []).push(skill);
    return acc;
  }, {} as Record<string, SkillInfo[]>);

  const phaseLabels: Record<string, string> = {
    'pre-writing': '构思', drafting: '写作', editing: '编辑', polishing: '润色', export: '导出',
  };

  const textPreview = selectedText.length > 80
    ? selectedText.slice(0, 80) + '…'
    : selectedText;

  return (
    <div className="flex flex-col py-3 relative">
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
            const label = SKILL_LABELS[skill.name] || skill.name;
            const icon = SKILL_ICONS[skill.name] || <Wand2 size={16} />;

            return (
              <button
                key={skill.name}
                onClick={() => handleSkillClick(skill.name)}
                disabled={!selectedText && !isAuto}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all text-[13px] group relative ${
                  !selectedText && !isAuto ? 'opacity-30 cursor-not-allowed' : ''
                } text-text-secondary hover:bg-surface-hover hover:text-text-primary`}
              >
                <span className="shrink-0 text-text-muted group-hover:text-text-secondary transition-colors">
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

      {/* Confirmation dialog */}
      {confirmSkill && (
        <div className="absolute inset-0 z-40 flex items-start justify-center pt-20 bg-bg/80 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl shadow-xl mx-4 p-5 w-full max-w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent-subtle flex items-center justify-center">
                  {SKILL_ICONS[confirmSkill.name] || <Wand2 size={14} className="text-accent" />}
                </div>
                <span className="text-sm font-semibold text-text-primary">{confirmSkill.label}</span>
              </div>
              <button onClick={handleCancel} className="btn-ghost p-1">
                <X size={14} />
              </button>
            </div>

            <p className="text-[11px] text-text-muted mb-3">{confirmSkill.desc}</p>

            {selectedText && (
              <div className="bg-bg-editor border border-border rounded-lg p-2.5 mb-4">
                <p className="text-[10px] text-text-muted mb-1">选中文字:</p>
                <p className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
                  {textPreview}
                </p>
              </div>
            )}

            {!selectedText && (
              <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-lg p-2.5 mb-4">
                <p className="text-[11px] text-yellow-500/80">
                  未选中文字，将对全文执行此技能
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="flex-1 px-3 py-2 border border-border rounded-lg text-[12px] text-text-secondary hover:bg-surface-hover transition-all"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-3 py-2 bg-accent text-black rounded-lg text-[12px] font-medium hover:bg-accent-hover transition-all flex items-center justify-center gap-1.5"
              >
                确认执行 <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
