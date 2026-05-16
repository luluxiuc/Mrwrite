'use client';
import { useState, useRef, useCallback } from 'react';
import { PanelLeft, PanelRight, PenLine } from 'lucide-react';

interface ThreePanelLayoutProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}

export function ThreePanelLayout({ leftPanel, centerPanel, rightPanel }: ThreePanelLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(380);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState<'left' | 'right' | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback((side: 'left' | 'right', currentWidth: number, e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(side);
    startX.current = e.clientX;
    startWidth.current = currentWidth;

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX.current;
      const newWidth = side === 'left'
        ? startWidth.current + delta
        : startWidth.current - delta;
      const clampedWidth = side === 'left'
        ? Math.max(200, Math.min(400, newWidth))
        : Math.max(300, Math.min(560, newWidth));

      if (side === 'left') setLeftWidth(clampedWidth);
      else setRightWidth(clampedWidth);
    };

    const onMouseUp = () => {
      setIsDragging(null);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  return (
    <div className={`h-screen flex overflow-hidden ${isDragging ? 'select-none' : ''}`}>
      {/* Left sidebar */}
      <div
        className={`sidebar-transition shrink-0 overflow-hidden flex flex-col bg-surface border-r border-border ${leftCollapsed ? 'w-0 border-r-0' : ''}`}
        style={{ width: leftCollapsed ? 0 : leftWidth }}
      >
        {leftPanel}
      </div>

      {/* Resize handle */}
      {!leftCollapsed && (
        <div
          className="w-[3px] shrink-0 cursor-col-resize hover:bg-accent/30 transition-colors relative group"
          onMouseDown={(e) => onMouseDown('left', leftWidth, e)}
        >
          <div className={`absolute inset-y-0 -left-1 -right-1 ${isDragging === 'left' ? 'bg-accent/20' : ''}`} />
        </div>
      )}

      {/* Center */}
      <div className="flex-1 overflow-hidden flex flex-col bg-bg">
        {/* Top bar */}
        <div className="h-10 bg-surface/50 border-b border-border flex items-center px-4 gap-3 shrink-0 backdrop-blur-sm">
          <button
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            className={`btn-ghost p-1.5 text-xs ${!leftCollapsed ? 'text-accent' : ''}`}
            title={leftCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            <PanelLeft size={16} />
          </button>
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <PenLine size={14} className="text-accent" />
            <span className="font-medium text-text-primary">MrWrite</span>
          </div>
          <div className="flex-1" />
          <span className="text-[11px] text-text-muted">Writer&apos;s Studio</span>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={() => setRightCollapsed(!rightCollapsed)}
            className={`btn-ghost p-1.5 text-xs ${!rightCollapsed ? 'text-accent' : ''}`}
            title={rightCollapsed ? 'Show AI panel' : 'Hide AI panel'}
          >
            <PanelRight size={16} />
          </button>
        </div>
        {centerPanel}
      </div>

      {/* Resize handle */}
      {!rightCollapsed && (
        <div
          className="w-[3px] shrink-0 cursor-col-resize hover:bg-accent/30 transition-colors relative group"
          onMouseDown={(e) => onMouseDown('right', rightWidth, e)}
        >
          <div className={`absolute inset-y-0 -left-1 -right-1 ${isDragging === 'right' ? 'bg-accent/20' : ''}`} />
        </div>
      )}

      {/* Right panel */}
      <div
        className={`sidebar-transition shrink-0 overflow-hidden flex flex-col bg-surface border-l border-border ${rightCollapsed ? 'w-0 border-l-0' : ''}`}
        style={{ width: rightCollapsed ? 0 : rightWidth }}
      >
        {rightPanel}
      </div>
    </div>
  );
}
