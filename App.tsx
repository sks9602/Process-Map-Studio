import React, { useState } from 'react';
import { 
  NodeData, LinkData, DiagramData, NodeType, ToolMode, 
  LinkType, ContextMenuState, LineStyle, ArrowShape, Role
} from './types';
import { DEFAULT_NEW_LINK, MOCK_INITIAL_DATA, DEFAULT_NODE_SIZE } from './constants';
import { Toolbar } from './components/Toolbar';
import { SidebarLeft } from './components/SidebarLeft';
import { SidebarRight } from './components/SidebarRight';
import { Canvas } from './components/Canvas';
import { ContextMenu } from './components/ContextMenu';
import { X, ChevronDown, ChevronRight, Plus, Trash } from 'lucide-react';

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export default function App() {
  // State
  const [diagrams, setDiagrams] = useState<DiagramData[]>([MOCK_INITIAL_DATA]);
  const [activeDiagramId, setActiveDiagramId] = useState<string>(MOCK_INITIAL_DATA.id);
  
  const activeDiagramIndex = diagrams.findIndex(d => d.id === activeDiagramId);
  // Ensure we always have a valid diagram if possible
  const activeDiagram = activeDiagramIndex >= 0 ? diagrams[activeDiagramIndex] : (diagrams.length > 0 ? diagrams[0] : null);

  const [currentViewId, setCurrentViewId] = useState<string | null>(null); // Drill-down parentId
  const [viewStack, setViewStack] = useState<{id: string, name: string}[]>([]);
  
  const [toolMode, setToolMode] = useState<ToolMode>('SELECT');
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedLinkIds, setSelectedLinkIds] = useState<Set<string>>(new Set());
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0 });
  
  // Modals
  const [isActorModalOpen, setIsActorModalOpen] = useState(false);
  const [isMapActorModalOpen, setIsMapActorModalOpen] = useState(false); // For adding new map
  const [pendingActorsSelection, setPendingActorsSelection] = useState<Set<string>>(new Set());

  // Fail-safe loading state
  if (!activeDiagram) {
      return (
          <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
              <div className="text-gray-500">Loading Process Map Studio...</div>
          </div>
      );
  }

  // --- CRUD Operations ---

  const updateDiagram = (updates: Partial<DiagramData>) => {
    const newDiagrams = [...diagrams];
    const idx = diagrams.findIndex(d => d.id === activeDiagram.id);
    if (idx >= 0) {
        newDiagrams[idx] = { ...activeDiagram, ...updates };
        setDiagrams(newDiagrams);
    }
  };

  const reorderDiagrams = (fromIndex: number, toIndex: number) => {
      const newDiagrams = [...diagrams];
      const [moved] = newDiagrams.splice(fromIndex, 1);
      newDiagrams.splice(toIndex, 0, moved);
      setDiagrams(newDiagrams);
  };

  const initAddDiagram = () => {
      setPendingActorsSelection(new Set());
      setIsMapActorModalOpen(true);
  };

  const createDiagramWithActors = (selectedActorNames: string[]) => {
      const newMap: DiagramData = {
          id: generateId('map'),
          name: 'New Process Map',
          description: '',
          nodes: [],
          links: [],
          roles: selectedActorNames.length > 0 
            ? selectedActorNames.map((name, i) => ({ id: generateId('role'), name, height: 200, order: i }))
            : [
                { id: generateId('role'), name: 'User', height: 200, order: 0 },
                { id: generateId('role'), name: 'System', height: 200, order: 1 }
              ]
      };
      const newDiagrams = [...diagrams, newMap];
      setDiagrams(newDiagrams);
      setActiveDiagramId(newMap.id);
      setCurrentViewId(null);
      setViewStack([]);
      setIsMapActorModalOpen(false);
  };

  const createNode = (type: NodeType, x: number, y: number) => {
    const size = DEFAULT_NODE_SIZE[type];
    const newNode: NodeData = {
      id: generateId('node'),
      type,
      parentId: currentViewId,
      x,
      y,
      width: size.width,
      height: size.height,
      label: type === NodeType.UNIT_PROCESS ? 'New Process' : 
             type === NodeType.GROUP_DIVISION ? 'New Division' : 
             type === NodeType.START ? 'Start' :
             type === NodeType.END ? 'End' : 'New Object',
      processId: type === NodeType.UNIT_PROCESS ? 'P-New' : undefined,
      helpVisible: type === NodeType.HELP ? false : undefined
    };
    updateDiagram({ nodes: [...activeDiagram.nodes, newNode] });
    setSelectedNodeIds(new Set([newNode.id]));
    setIsSidebarOpen(true);
    setToolMode('SELECT'); 
  };

  const updateNode = (id: string, updates: Partial<NodeData>) => {
    const newNodes = activeDiagram.nodes.map(n => n.id === id ? { ...n, ...updates } : n);
    updateDiagram({ nodes: newNodes });
  };

  const moveNode = (id: string, x: number, y: number) => {
    updateNode(id, { x, y });
  };

  const resizeNode = (id: string, x: number, y: number, width: number, height: number) => {
      updateNode(id, { x, y, width, height });
  };

  const addLink = (sourceId: string, targetId: string) => {
    const newLink: LinkData = {
      id: generateId('link'),
      sourceId,
      targetId,
      parentId: currentViewId,
      ...DEFAULT_NEW_LINK,
      type: toolMode === 'CONNECT_STRAIGHT' ? LinkType.STRAIGHT : LinkType.ELBOW
    };
    updateDiagram({ links: [...activeDiagram.links, newLink] });
    setToolMode('SELECT'); 
  };

  const updateLink = (id: string, updates: Partial<LinkData>) => {
    const newLinks = activeDiagram.links.map(l => l.id === id ? { ...l, ...updates } : l);
    updateDiagram({ links: newLinks });
  };

  // Role Operations
  const updateRole = (id: string, updates: any) => {
    const newRoles = activeDiagram.roles.map(r => r.id === id ? { ...r, ...updates } : r);
    updateDiagram({ roles: newRoles });
  };

  const reorderRoles = (draggedId: string, targetId: string) => {
      const roles = [...activeDiagram.roles];
      const fromRole = roles.find(r => r.id === draggedId);
      const toRole = roles.find(r => r.id === targetId);
      
      if (!fromRole || !toRole) return;

      // Constraint: Child Actor cannot leave its Parent Actor Group.
      if (fromRole.parentId !== toRole.parentId) {
          return;
      }

      const fromIndex = roles.findIndex(r => r.id === draggedId);
      const toIndex = roles.findIndex(r => r.id === targetId);
      
      if (fromIndex < 0 || toIndex < 0) return;

      const [moved] = roles.splice(fromIndex, 1);
      roles.splice(toIndex, 0, moved);
      
      updateDiagram({ roles: roles });
  };

  const addRole = (parentId: string | null = null) => {
      const newRole = {
          id: generateId('role'),
          name: 'New Actor',
          height: 200,
          order: activeDiagram.roles.length,
          parentId
      };
      updateDiagram({ roles: [...activeDiagram.roles, newRole] });
  };
  
  const deleteRole = (id: string) => {
      updateDiagram({ roles: activeDiagram.roles.filter(r => r.id !== id) });
  };

  // --- Complex Actions ---

  const handleCanvasClick = (e: React.MouseEvent, x: number, y: number) => {
      if (toolMode.startsWith('CREATE_')) {
          let type: NodeType;
          switch(toolMode) {
              case 'CREATE_UNIT_PROCESS': type = NodeType.UNIT_PROCESS; break;
              case 'CREATE_GROUP_PROCESS': type = NodeType.GROUP_PROCESS; break;
              case 'CREATE_GROUP_DIVISION': type = NodeType.GROUP_DIVISION; break;
              case 'CREATE_DECISION': type = NodeType.DECISION; break;
              case 'CREATE_HELP': type = NodeType.HELP; break;
              case 'CREATE_START': type = NodeType.START; break;
              case 'CREATE_END': type = NodeType.END; break;
              default: return;
          }
          createNode(type, x - 50, y - 25);
      } else {
          // Clicking empty space
          setSelectedNodeIds(new Set());
          setSelectedLinkIds(new Set());
          setIsSidebarOpen(false); // Close sidebar on single click background
      }
  };

  const handleGroup = (type: NodeType.GROUP_PROCESS | NodeType.GROUP_DIVISION) => {
      if (selectedNodeIds.size === 0) return;
      const selectedNodes = activeDiagram.nodes.filter(n => selectedNodeIds.has(n.id));
      if (selectedNodes.length === 0) return;

      const minX = Math.min(...selectedNodes.map(n => n.x));
      const minY = Math.min(...selectedNodes.map(n => n.y));
      const maxX = Math.max(...selectedNodes.map(n => n.x + n.width));
      const maxY = Math.max(...selectedNodes.map(n => n.y + n.height));

      if (type === NodeType.GROUP_DIVISION) {
          const newNode: NodeData = {
              id: generateId('division'),
              type: NodeType.GROUP_DIVISION,
              parentId: currentViewId,
              x: minX - 20,
              y: minY - 40,
              width: (maxX - minX) + 40,
              height: (maxY - minY) + 60,
              label: 'Group Division'
          };
          updateDiagram({ nodes: [...activeDiagram.nodes, newNode] });
          setSelectedNodeIds(new Set([newNode.id]));
          setIsSidebarOpen(true);
      } else {
          const newGroupId = generateId('group');
          const newNode: NodeData = {
              id: newGroupId,
              type: NodeType.GROUP_PROCESS,
              parentId: currentViewId,
              x: minX,
              y: minY,
              width: 160,
              height: 90,
              label: 'New Group Process'
          };
          const updatedNodes = activeDiagram.nodes.map(n => {
              if (selectedNodeIds.has(n.id)) {
                  return { ...n, parentId: newGroupId };
              }
              return n;
          });
          updateDiagram({ nodes: [...updatedNodes, newNode] });
          setSelectedNodeIds(new Set([newGroupId]));
          setIsSidebarOpen(true);
      }
  };

  const handleMoveToParent = () => {
    if (selectedNodeIds.size === 0) return;
    
    let newParentId: string | null = null;
    if (currentViewId) {
        const currentGroupNode = activeDiagram.nodes.find(n => n.id === currentViewId);
        newParentId = currentGroupNode ? currentGroupNode.parentId : null;
    } else {
        return; 
    }

    const newNodes = activeDiagram.nodes.map(n => {
        if (selectedNodeIds.has(n.id)) {
            return { ...n, parentId: newParentId };
        }
        return n;
    });

    updateDiagram({ nodes: newNodes });
    setSelectedNodeIds(new Set());
  };

  const handleAlign = (alignment: string) => {
      if (selectedNodeIds.size < 2) return;
      const nodesToAlign = activeDiagram.nodes.filter(n => selectedNodeIds.has(n.id));
      
      const minX = Math.min(...nodesToAlign.map(n => n.x));
      const maxX = Math.max(...nodesToAlign.map(n => n.x + n.width));
      const minY = Math.min(...nodesToAlign.map(n => n.y));
      const maxY = Math.max(...nodesToAlign.map(n => n.y + n.height));
      
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;

      const updates: NodeData[] = [];
      nodesToAlign.forEach(n => {
          let u = { ...n };
          switch(alignment) {
              case 'top': u.y = minY; break;
              case 'bottom': u.y = maxY - n.height; break;
              case 'left': u.x = minX; break;
              case 'right': u.x = maxX - n.width; break;
              case 'h-center': u.x = midX - n.width / 2; break; 
              case 'v-center': u.y = midY - n.height / 2; break; 
          }
          updates.push(u);
      });

      const newNodes = activeDiagram.nodes.map(n => {
          const updated = updates.find(u => u.id === n.id);
          return updated || n;
      });
      updateDiagram({ nodes: newNodes });
  };

  const handleColorChange = (type: 'fill' | 'stroke' | 'text', color: string) => {
      if (selectedNodeIds.size > 0) {
          const newNodes = activeDiagram.nodes.map(n => {
              if (selectedNodeIds.has(n.id)) {
                  if (type === 'fill') return { ...n, backgroundColor: color };
                  if (type === 'stroke') return { ...n, borderColor: color };
                  if (type === 'text') return { ...n, textColor: color };
              }
              return n;
          });
          updateDiagram({ nodes: newNodes });
      } else if (selectedLinkIds.size > 0 && type === 'stroke') {
          const newLinks = activeDiagram.links.map(l => {
              if (selectedLinkIds.has(l.id)) {
                  return { ...l, color: color };
              }
              return l;
          });
          updateDiagram({ links: newLinks });
      } else if (contextMenu.targetType === 'ROLE' && contextMenu.targetId) {
          if (type === 'text') {
              updateRole(contextMenu.targetId, { textColor: color });
          }
      }
  };

  const handleLineStyleChange = (style: LineStyle) => {
       if (selectedLinkIds.size > 0) {
          const newLinks = activeDiagram.links.map(l => {
              if (selectedLinkIds.has(l.id)) {
                  return { ...l, style };
              }
              return l;
          });
          updateDiagram({ links: newLinks });
       }
  };

  const handleArrowShapeChange = (shape: ArrowShape) => {
      if (selectedLinkIds.size > 0) {
          const newLinks = activeDiagram.links.map(l => {
              if (selectedLinkIds.has(l.id)) {
                  return { ...l, endMarker: shape };
              }
              return l;
          });
          updateDiagram({ links: newLinks });
      }
  };

  const handleDelete = () => {
      const remainingNodes = activeDiagram.nodes.filter(n => !selectedNodeIds.has(n.id));
      const remainingLinks = activeDiagram.links.filter(l => 
          !selectedLinkIds.has(l.id) && 
          !selectedNodeIds.has(l.sourceId) && 
          !selectedNodeIds.has(l.targetId)
      );
      updateDiagram({ nodes: remainingNodes, links: remainingLinks });
      setSelectedNodeIds(new Set());
      setSelectedLinkIds(new Set());
      setIsSidebarOpen(false);
  };

  const handleDoubleClick = (type: 'NODE' | 'LINK' | 'MAP', id?: string) => {
      if (type === 'NODE' && id) {
           setSelectedNodeIds(new Set([id]));
           setIsSidebarOpen(true);
      } else if (type === 'LINK' && id) {
           setSelectedLinkIds(new Set([id]));
           setIsSidebarOpen(true);
      } else if (type === 'MAP') {
          setSelectedNodeIds(new Set());
          setSelectedLinkIds(new Set());
          setIsSidebarOpen(true);
      }
  };

  const navigateToGroup = (groupId: string) => {
       const node = activeDiagram.nodes.find(n => n.id === groupId);
       if (node) {
           setCurrentViewId(node.id);
           setViewStack([...viewStack, { id: node.id, name: node.label }]);
       }
  };

  const handleExport = () => {
      const dataStr = JSON.stringify(diagrams, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `process_maps_${Date.now()}.json`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImport = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const content = e.target?.result as string;
              const importedDiagrams = JSON.parse(content);
              if (Array.isArray(importedDiagrams)) {
                  setDiagrams(importedDiagrams);
                  setActiveDiagramId(importedDiagrams[0]?.id || diagrams[0].id);
                  setCurrentViewId(null);
                  setViewStack([]);
              }
          } catch (err) {
              alert("Invalid JSON file");
          }
      };
      reader.readAsText(file);
  };

  const getAllUniqueActorNames = () => {
      const names = new Set<string>();
      diagrams.forEach(d => {
          d.roles.forEach(r => names.add(r.name));
      });
      return Array.from(names);
  };

  // --- Context Menus ---
  const getContextMenuItems = () => {
    const items = [];
    
    // MINIMAP
    if (contextMenu.targetType === 'MINIMAP') {
        items.push({ label: 'Add Process Map', onClick: initAddDiagram });
        return items;
    }

    // CANVAS
    if (contextMenu.targetType === 'CANVAS') {
      items.push({ label: 'Add Unit Process', onClick: () => createNode(NodeType.UNIT_PROCESS, contextMenu.x - 280, contextMenu.y - 100) });
      items.push({ label: 'Add Decision', onClick: () => createNode(NodeType.DECISION, contextMenu.x - 280, contextMenu.y - 100) });
    }
    
    // ROLE
    if (contextMenu.targetType === 'ROLE' && contextMenu.targetId) {
         items.push({ label: 'Text Color: Black', onClick: () => handleColorChange('text', '#1f2937') });
         items.push({ label: 'Text Color: Blue', onClick: () => handleColorChange('text', '#2563eb') });
         items.push({ label: 'Text Color: Red', onClick: () => handleColorChange('text', '#dc2626') });
         return items;
    }

    // SELECTION (NODE)
    if (selectedNodeIds.size > 0 && contextMenu.targetType === 'NODE') {
        // Grouping
        items.push({ label: 'Group as Process', onClick: () => handleGroup(NodeType.GROUP_PROCESS) });
        items.push({ label: 'Group as Division', onClick: () => handleGroup(NodeType.GROUP_DIVISION) });
        
        // Navigation (Drill down)
        if (selectedNodeIds.size === 1) {
            const nodeId = Array.from(selectedNodeIds)[0];
            const node = activeDiagram.nodes.find(n => n.id === nodeId);
            if (node?.type === NodeType.GROUP_PROCESS) {
                items.push({ separator: true, label: '', onClick: () => {} });
                items.push({ label: 'Enter Group', onClick: () => navigateToGroup(node.id) });
            }
        }

        // Ungrouping / Moving Up
        if (currentViewId) {
            items.push({ label: 'Move to Parent Level', onClick: handleMoveToParent });
        }

        items.push({ separator: true, label: '', onClick: () => {} });
        
        // Node Styling via Context Menu
        items.push({ label: 'Color: Red', onClick: () => handleColorChange('fill', '#fee2e2') });
        items.push({ label: 'Color: Green', onClick: () => handleColorChange('fill', '#dcfce7') });
        items.push({ label: 'Color: Blue', onClick: () => handleColorChange('fill', '#dbeafe') });
        items.push({ label: 'Color: Yellow', onClick: () => handleColorChange('fill', '#fef9c3') });
        
        items.push({ separator: true, label: '', onClick: () => {} });
        items.push({ label: 'Text: Black', onClick: () => handleColorChange('text', '#1f2937') });
        items.push({ label: 'Text: Blue', onClick: () => handleColorChange('text', '#2563eb') });
        items.push({ label: 'Text: Red', onClick: () => handleColorChange('text', '#dc2626') });


        items.push({ separator: true, label: '', onClick: () => {} });
        items.push({ label: 'Delete', onClick: handleDelete, danger: true });
    }

    // LINK
    if (contextMenu.targetType === 'LINK' && contextMenu.targetId) {
        const linkId = contextMenu.targetId;
        items.push({ label: 'Delete Link', onClick: () => {
             updateDiagram({ links: activeDiagram.links.filter(l => l.id !== linkId) });
        }, danger: true });
        items.push({ separator: true, label: '', onClick: () => {} });
        
        // Types
        items.push({ label: 'Straight Line', onClick: () => updateLink(linkId, { type: LinkType.STRAIGHT }) });
        items.push({ label: 'Elbow Line', onClick: () => updateLink(linkId, { type: LinkType.ELBOW }) });
        
        items.push({ separator: true, label: '', onClick: () => {} });
        // Styles
        items.push({ label: 'Solid Style', onClick: () => updateLink(linkId, { style: LineStyle.SOLID }) });
        items.push({ label: 'Dashed Style', onClick: () => updateLink(linkId, { style: LineStyle.DASHED }) });
        items.push({ label: 'Dotted Style', onClick: () => updateLink(linkId, { style: LineStyle.DOTTED }) });
        
        items.push({ separator: true, label: '', onClick: () => {} });
        // Arrows
        items.push({ label: 'End: None', onClick: () => updateLink(linkId, { endMarker: ArrowShape.NONE }) });
        items.push({ label: 'End: Arrow', onClick: () => updateLink(linkId, { endMarker: ArrowShape.ARROW }) });
        items.push({ label: 'End: Filled Triangle', onClick: () => updateLink(linkId, { endMarker: ArrowShape.TRIANGLE_FILLED }) });
        items.push({ label: 'End: Empty Triangle', onClick: () => updateLink(linkId, { endMarker: ArrowShape.TRIANGLE_EMPTY }) });
        items.push({ label: 'End: Circle', onClick: () => updateLink(linkId, { endMarker: ArrowShape.CIRCLE }) });

        items.push({ separator: true, label: '', onClick: () => {} });
        items.push({ label: 'Color: Gray', onClick: () => updateLink(linkId, { color: '#6b7280' }) });
        items.push({ label: 'Color: Blue', onClick: () => updateLink(linkId, { color: '#2563eb' }) });
        items.push({ label: 'Color: Red', onClick: () => updateLink(linkId, { color: '#dc2626' }) });
    }

    return items;
  };

  const renderActorTree = (parentId: string | null = null, depth = 0) => {
      const actors = activeDiagram.roles.filter(r => r.parentId === parentId || (!r.parentId && parentId === null));
      return (
          <div className={`flex flex-col ${depth > 0 ? 'ml-4 border-l border-gray-200 pl-2' : ''}`}>
              {actors.map(actor => (
                  <div key={actor.id} className="mb-2">
                      <div className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                          <div className="flex items-center space-x-2">
                               <input 
                                  type="text" 
                                  value={actor.name} 
                                  onChange={(e) => updateRole(actor.id, { name: e.target.value })}
                                  className="text-sm font-semibold bg-transparent border-b border-transparent focus:border-blue-500 outline-none w-32" 
                               />
                               
                               {/* Background Color */}
                               <div className="flex flex-col items-center">
                                   <label className="text-[9px] text-gray-400 leading-none">Bg</label>
                                   <input 
                                       type="color" 
                                       value={actor.color || '#ffffff'} 
                                       onChange={(e) => updateRole(actor.id, { color: e.target.value })} 
                                       className="w-6 h-6 rounded cursor-pointer border-none bg-transparent" 
                                       title="Background Color"
                                   />
                               </div>

                               {/* Text Color */}
                               <div className="flex flex-col items-center">
                                   <label className="text-[9px] text-gray-400 leading-none">Txt</label>
                                   <input 
                                       type="color" 
                                       value={actor.textColor || '#9ca3af'} 
                                       onChange={(e) => updateRole(actor.id, { textColor: e.target.value })} 
                                       className="w-6 h-6 rounded cursor-pointer border-none bg-transparent" 
                                       title="Text Color"
                                   />
                               </div>
                          </div>
                          <div className="flex items-center space-x-1">
                               <button onClick={() => addRole(actor.id)} className="p-1 hover:bg-gray-200 rounded text-blue-600" title="Add Sub-Actor"><Plus size={14}/></button>
                               <button onClick={() => deleteRole(actor.id)} className="p-1 hover:bg-gray-200 rounded text-red-600" title="Delete Actor"><Trash size={14}/></button>
                          </div>
                      </div>
                      {renderActorTree(actor.id, depth + 1)}
                  </div>
              ))}
          </div>
      );
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-sm bg-gray-100 font-sans">
      <Toolbar 
        onSetTool={setToolMode}
        onAddProcessMap={initAddDiagram}
        onManageActors={() => setIsActorModalOpen(true)}
        currentTool={toolMode}
        onAlign={handleAlign}
        onColorChange={handleColorChange}
        onLineStyleChange={handleLineStyleChange}
        onArrowShapeChange={handleArrowShapeChange}
        onExport={handleExport}
        onImport={handleImport}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        <SidebarLeft 
          diagrams={diagrams} 
          activeDiagramId={activeDiagramId}
          onSelectDiagram={setActiveDiagramId} 
          onDoubleClickDiagram={(id) => { setActiveDiagramId(id); handleDoubleClick('MAP'); }}
          onReorderDiagrams={reorderDiagrams}
          onContextMenu={setContextMenu}
        />
        
        <Canvas 
          nodes={activeDiagram.nodes}
          links={activeDiagram.links}
          roles={activeDiagram.roles}
          viewStack={viewStack}
          currentViewId={currentViewId}
          toolMode={toolMode}
          selectedNodeIds={selectedNodeIds}
          selectedLinkIds={selectedLinkIds}
          onNodeMove={moveNode}
          onNodeResize={resizeNode}
          onRoleResize={(id, h) => updateRole(id, { height: h })}
          onRoleReorder={reorderRoles}
          onAddLink={addLink}
          onUpdateLink={updateLink}
          onSelectionChange={(nodeIds, linkIds) => {
             setSelectedNodeIds(new Set(nodeIds));
             setSelectedLinkIds(new Set(linkIds));
          }}
          onNavigate={(id, name) => {
              if (id === null) { setCurrentViewId(null); setViewStack([]); }
              else {
                  setCurrentViewId(id);
                  const exists = viewStack.findIndex(v => v.id === id);
                  if (exists >= 0) setViewStack(viewStack.slice(0, exists + 1));
                  else setViewStack([...viewStack, { id, name: name || 'Group' }]);
              }
              setSelectedNodeIds(new Set());
          }}
          onContextMenu={setContextMenu}
          onBackgroundClick={handleCanvasClick}
          onDoubleClickHandler={handleDoubleClick}
        />

        <SidebarRight 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          selectedNode={selectedNodeIds.size === 1 ? activeDiagram.nodes.find(n => n.id === Array.from(selectedNodeIds)[0]) || null : null}
          selectedLink={selectedLinkIds.size === 1 ? activeDiagram.links.find(l => l.id === Array.from(selectedLinkIds)[0]) || null : null}
          activeDiagram={activeDiagram}
          onUpdateNode={updateNode}
          onUpdateLink={updateLink}
          onUpdateDiagram={updateDiagram}
          onDelete={handleDelete}
        />

        {contextMenu.visible && (
          <ContextMenu 
            x={contextMenu.x} 
            y={contextMenu.y} 
            items={getContextMenuItems()} 
            onClose={() => setContextMenu({ ...contextMenu, visible: false })} 
          />
        )}

        {/* Actor Management Modal */}
        {isActorModalOpen && (
            <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-xl w-[500px] max-h-[80vh] flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b">
                        <h3 className="font-bold text-lg">Manage Actors</h3>
                        <button onClick={() => setIsActorModalOpen(false)}><X size={20}/></button>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto">
                        <div className="mb-4">
                            <button onClick={() => addRole()} className="flex items-center text-blue-600 hover:bg-blue-50 px-3 py-2 rounded text-sm font-medium transition-colors">
                                <Plus size={16} className="mr-2"/> Add Root Actor
                            </button>
                        </div>
                        {renderActorTree()}
                    </div>
                    <div className="p-4 border-t bg-gray-50 flex justify-end">
                        <button onClick={() => setIsActorModalOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Close</button>
                    </div>
                </div>
            </div>
        )}

        {/* New Map Actor Selection Modal */}
        {isMapActorModalOpen && (
            <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-xl w-[400px] flex flex-col">
                    <div className="flex justify-between items-center p-4 border-b">
                        <h3 className="font-bold text-lg">Select Actors for New Map</h3>
                        <button onClick={() => setIsMapActorModalOpen(false)}><X size={20}/></button>
                    </div>
                    <div className="p-4 overflow-y-auto max-h-[60vh]">
                        <p className="text-xs text-gray-500 mb-2">Select existing actors to include in the new process map.</p>
                        <div className="space-y-2">
                            {getAllUniqueActorNames().map(name => (
                                <label key={name} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={pendingActorsSelection.has(name)}
                                        onChange={(e) => {
                                            const newSet = new Set(pendingActorsSelection);
                                            if (e.target.checked) newSet.add(name);
                                            else newSet.delete(name);
                                            setPendingActorsSelection(newSet);
                                        }}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium">{name}</span>
                                </label>
                            ))}
                            {getAllUniqueActorNames().length === 0 && (
                                <p className="text-sm italic text-gray-400">No existing actors found. Default actors will be created.</p>
                            )}
                        </div>
                    </div>
                    <div className="p-4 border-t bg-gray-50 flex justify-end space-x-2">
                        <button onClick={() => setIsMapActorModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">Cancel</button>
                        <button 
                            onClick={() => createDiagramWithActors(Array.from(pendingActorsSelection))} 
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Create Map
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}