import React, { useRef } from 'react';
import { DiagramData, NodeType } from '../types';
import { LayoutDashboard } from 'lucide-react';

interface SidebarLeftProps {
  diagrams: DiagramData[];
  activeDiagramId: string;
  onSelectDiagram: (id: string) => void;
  onDoubleClickDiagram: (id: string) => void; // New prop
  onReorderDiagrams: (fromIndex: number, toIndex: number) => void;
  onContextMenu: (e: React.MouseEvent, type: 'MINIMAP', id?: string) => void;
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({ 
  diagrams, 
  activeDiagramId, 
  onSelectDiagram, 
  onDoubleClickDiagram,
  onReorderDiagrams,
  onContextMenu 
}) => {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (position: number) => {
    dragItem.current = position;
  };

  const handleDragEnter = (position: number) => {
    dragOverItem.current = position;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
        onReorderDiagrams(dragItem.current, dragOverItem.current);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const getNodeStyle = (type: NodeType) => {
      switch (type) {
          case NodeType.DECISION:
              return { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', borderRadius: 0 };
          case NodeType.START:
          case NodeType.END:
              return { borderRadius: '50%' };
          case NodeType.HELP:
              return { borderRadius: '12px', border: '1px solid #93c5fd' }; 
          case NodeType.GROUP_DIVISION:
              return { background: 'transparent', borderStyle: 'dashed' };
          default:
              return { borderRadius: '2px' };
      }
  };

  return (
    <div 
      className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full"
      onContextMenu={(e) => onContextMenu(e, 'MINIMAP')}
    >
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-sm font-bold text-gray-700 flex items-center">
          <LayoutDashboard size={16} className="mr-2" />
          Process Overview
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {diagrams.map((d, index) => (
          <div 
            key={d.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => onSelectDiagram(d.id)}
            onDoubleClick={() => onDoubleClickDiagram(d.id)} // Trigger property view
            className={`p-3 rounded border cursor-pointer transition-all ${
              activeDiagramId === d.id 
              ? 'bg-blue-50 border-blue-400 shadow-sm' 
              : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Simple CSS Minimap Representation */}
            <div className="h-24 bg-gray-100 mb-2 rounded border border-gray-100 relative overflow-hidden pointer-events-none">
                {d.nodes.slice(0, 10).map((n, i) => (
                    <div 
                        key={i} 
                        className={`absolute border border-blue-300 ${n.type === NodeType.DECISION ? 'bg-yellow-100' : 'bg-blue-200'}`}
                        style={{
                            left: `${(n.x / 2000) * 100}%`,
                            top: `${(n.y / 2000) * 100}%`,
                            width: '8%',
                            height: '8%',
                            ...getNodeStyle(n.type)
                        }}
                    />
                ))}
            </div>
            <h3 className="text-sm font-semibold text-gray-800 truncate">{d.name}</h3>
            <p className="text-xs text-gray-500 truncate">{d.description || 'No description'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};