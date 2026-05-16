'use client';
import { useCallback, useRef } from 'react';

interface ResizeHandleProps {
  onResize: (delta: number) => void;
  direction: 'horizontal' | 'vertical';
}

export function ResizeHandle({ onResize, direction }: ResizeHandleProps) {
  const startPos = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;

    const onMouseMove = (e: MouseEvent) => {
      const current = direction === 'horizontal' ? e.clientX : e.clientY;
      onResize(current - startPos.current);
      startPos.current = current;
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [onResize, direction]);

  return (
    <div
      className={`${direction === 'horizontal' ? 'w-1 cursor-col-resize hover:bg-accent/50' : 'h-1 cursor-row-resize hover:bg-accent/50'} bg-border transition-colors shrink-0`}
      onMouseDown={onMouseDown}
    />
  );
}
