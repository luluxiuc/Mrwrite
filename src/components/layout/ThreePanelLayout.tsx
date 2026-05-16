'use client';
import { useState } from 'react';
import { ResizeHandle } from './ResizeHandle';

interface ThreePanelLayoutProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}

export function ThreePanelLayout({ leftPanel, centerPanel, rightPanel }: ThreePanelLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(52);
  const [rightWidth, setRightWidth] = useState(360);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden">
      {!leftCollapsed && (
        <>
          <div style={{ width: leftWidth }} className="shrink-0 overflow-y-auto bg-surface border-r border-border">
            {leftPanel}
          </div>
          <ResizeHandle direction="horizontal" onResize={(d) => setLeftWidth((w) => Math.max(48, Math.min(300, w + d)))} />
        </>
      )}

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="h-10 bg-surface border-b border-border flex items-center px-3 gap-2 shrink-0">
          <button
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            className="p-1 hover:bg-bg rounded text-gray-400 text-xs"
            title={leftCollapsed ? 'Show skills' : 'Hide skills'}
          >
            {leftCollapsed ? '☰' : '✕'}
          </button>
          <span className="text-sm text-gray-400">MrWrite</span>
          <div className="flex-1" />
          <button
            onClick={() => setRightCollapsed(!rightCollapsed)}
            className="p-1 hover:bg-bg rounded text-gray-400 text-xs"
            title={rightCollapsed ? 'Show AI' : 'Hide AI'}
          >
            {rightCollapsed ? '◀' : '▶'}
          </button>
        </div>
        {centerPanel}
      </div>

      {!rightCollapsed && (
        <>
          <ResizeHandle direction="horizontal" onResize={(d) => setRightWidth((w) => Math.max(280, Math.min(600, w + d)))} />
          <div style={{ width: rightWidth }} className="shrink-0 overflow-y-auto bg-surface border-l border-border">
            {rightPanel}
          </div>
        </>
      )}
    </div>
  );
}
