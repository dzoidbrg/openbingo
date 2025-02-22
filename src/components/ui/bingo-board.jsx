'use client';

import { cn } from '@/lib/utils';

export function BingoBoard({ size = 5, cells = [], onCellClick, selectedCells = [] }) {
  const gridCols = {
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5'
  }[size] || 'grid-cols-5';

  // Fill empty cells if not enough content provided
  const filledCells = [...cells];
  while (filledCells.length < size * size) {
    filledCells.push('');
  }

  return (
    <div className={cn('grid gap-4', gridCols)}>
      {filledCells.map((content, index) => (
        <div
          key={index}
          onClick={() => onCellClick?.(index)}
          className={cn(
            'aspect-square p-4 flex items-center justify-center text-center',
            'rounded-lg transition-all duration-200 cursor-pointer',
            'border-2 border-primary hover:bg-primary/5',
            selectedCells.includes(index) && 'bg-primary/20 border-primary/50',
            !content && 'border-dashed opacity-50'
          )}
        >
          <p className="text-sm">{content}</p>
        </div>
      ))}
    </div>
  );
}