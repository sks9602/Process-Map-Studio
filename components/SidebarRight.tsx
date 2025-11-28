
import React from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import { NodeData, LinkData, NodeType, DiagramData, Role } from '../types';

interface SidebarRightProps {
  selectedNode: NodeData | null;
  selectedLink: LinkData | null;
  activeDiagram: DiagramData; // Needed for map details
  isOpen: boolean;
  onClose: () => void;
  onUpdateNode: (id: string, updates: Partial<NodeData>) => void;
  onUpdateLink: (id: string, updates: Partial<LinkData>) => void;
  onUpdateDiagram: (updates: Partial<DiagramData>) => void;
  onDelete: () => void;
}

export const SidebarRight: React.FC<SidebarRightProps> = ({
  selectedNode,
  selectedLink,
  activeDiagram,
  isOpen,
  onClose,
  onUpdateNode,
  onUpdateLink,
  onUpdateDiagram,
  onDelete
}) => {
  
  const renderMapForm = () => (
    <div className="space-y-4">
        <h3 className="font-semibold text-gray-700 pb-2 border-b">Process Map Details</h3>
        <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Map Name</label>
            <input
            type="text"
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={activeDiagram.name}
            onChange={(e) => onUpdateDiagram({ name: e.target.value })}
            />
        </div>
        <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <textarea
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
            value={activeDiagram.description}
            onChange={(e) => onUpdateDiagram({ description: e.target.value })}
            />
        </div>
    </div>
  );

  const renderGeometry = (x: number, y: number, w: number, h: number, onChange: (updates: any) => void) => (
      <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded border border-gray-200 mt-4">
          <h4 className="col-span-2 text-xs font-bold text-gray-500">Geometry</h4>
          <div>
              <label className="text-[10px] text-gray-400">X</label>
              <input type="number" value={Math.round(x)} onChange={e => onChange({ x: Number(e.target.value) })} className="w-full text-xs border rounded px-1" />
          </div>
          <div>
              <label className="text-[10px] text-gray-400">Y</label>
              <input type="number" value={Math.round(y)} onChange={e => onChange({ y: Number(e.target.value) })} className="w-full text-xs border rounded px-1" />
          </div>
          <div>
              <label className="text-[10px] text-gray-400">W</label>
              <input type="number" value={Math.round(w)} onChange={e => onChange({ width: Number(e.target.value) })} className="w-full text-xs border rounded px-1" />
          </div>
          <div>
              <label className="text-[10px] text-gray-400">H</label>
              <input type="number" value={Math.round(h)} onChange={e => onChange({ height: Number(e.target.value) })} className="w-full text-xs border rounded px-1" />
          </div>
      </div>
  );

  const renderNodeForm = (node: NodeData) => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
           <h3 className="font-semibold text-gray-700">
             {node.type.replace('_', ' ')}
           </h3>
           <button onClick={onDelete} className="text-red-500 hover:text-red-700 p-1" title="Delete Object">
             <Trash2 size={16} />
           </button>
        </div>

        {(node.type === NodeType.UNIT_PROCESS || node.type === NodeType.DECISION) && (
           <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Process ID</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={node.processId || ''}
              onChange={(e) => onUpdateNode(node.id, { processId: e.target.value })}
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {node.type === NodeType.DECISION ? 'Condition Name' : 'Name'}
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={node.label}
            onChange={(e) => onUpdateNode(node.id, { label: e.target.value })}
          />
        </div>

        {node.type === NodeType.UNIT_PROCESS && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">URL</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={node.url || ''}
              onChange={(e) => onUpdateNode(node.id, { url: e.target.value })}
            />
          </div>
        )}

        {node.type === NodeType.HELP && (
          <div className="flex items-center space-x-2">
            <input 
                type="checkbox" 
                id="helpVisible"
                checked={node.helpVisible || false}
                onChange={(e) => onUpdateNode(node.id, { helpVisible: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="helpVisible" className="text-sm text-gray-700">Show Help Text on Map</label>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
          <textarea
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
            value={node.description || ''}
            onChange={(e) => onUpdateNode(node.id, { description: e.target.value })}
          />
        </div>

        <div>
             <label className="block text-xs font-medium text-gray-500 mb-1">Colors</label>
             <div className="flex space-x-4">
                 <div>
                     <span className="text-[10px]">Fill</span>
                     <input type="color" value={node.backgroundColor || '#ffffff'} onChange={e => onUpdateNode(node.id, { backgroundColor: e.target.value })} className="block" />
                 </div>
                 <div>
                     <span className="text-[10px]">Border</span>
                     <input type="color" value={node.borderColor || '#374151'} onChange={e => onUpdateNode(node.id, { borderColor: e.target.value })} className="block" />
                 </div>
             </div>
        </div>

        {renderGeometry(node.x, node.y, node.width, node.height, (u) => onUpdateNode(node.id, u))}
      </div>
    );
  };

  const renderLinkForm = (link: LinkData) => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-semibold text-gray-700">Connector Properties</h3>
            <button onClick={onDelete} className="text-red-500 hover:text-red-700 p-1" title="Delete Link">
             <Trash2 size={16} />
           </button>
        </div>
        
        <div>
           <label className="block text-xs font-medium text-gray-500 mb-1">Condition Label</label>
           <input
             type="text"
             className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
             value={link.label || ''}
             onChange={(e) => onUpdateLink(link.id, { label: e.target.value })}
             placeholder="e.g. Yes/No"
           />
        </div>

         <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
          <textarea
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
            value={link.description || ''}
            onChange={(e) => onUpdateLink(link.id, { description: e.target.value })}
          />
        </div>
        
        <div>
             <label className="block text-xs font-medium text-gray-500 mb-1">Line Color</label>
             <input type="color" value={link.color || '#6b7280'} onChange={e => onUpdateLink(link.id, { color: e.target.value })} className="block" />
        </div>
      </div>
    );
  };

  return (
    <div
      className={`fixed top-20 right-0 bottom-0 w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-gray-200 z-40 flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between p-4 bg-blue-50 border-b border-gray-200">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
          Process Info
        </h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {selectedNode 
            ? renderNodeForm(selectedNode) 
            : selectedLink 
                ? renderLinkForm(selectedLink) 
                : renderMapForm()
        }
      </div>
    </div>
  );
};
