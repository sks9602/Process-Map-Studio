
import React, { useEffect, useRef } from 'react';

interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-white border border-gray-200 shadow-xl rounded-md py-1 min-w-[200px]"
      style={{ top: Math.min(y, window.innerHeight - items.length * 36), left: Math.min(x, window.innerWidth - 200) }}
    >
      {items.map((item, index) => {
        if (item.separator) {
             return <div key={index} className="h-px bg-gray-200 my-1" />;
        }
        return (
            <button
            key={index}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex justify-between items-center ${
                item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
            }`}
            onClick={() => {
                item.onClick();
                onClose();
            }}
            >
            {item.label}
            </button>
        );
      })}
    </div>
  );
};
