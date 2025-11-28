import React, { useState, useRef, useEffect } from 'react';
import { 
  NodeData, LinkData, Role, NodeType, ContextMenuState, ToolMode, Coordinates, LineStyle, ResizeHandle 
} from '../types';
import { getLinkPathInfo, isPointInRect, getNearestPerimeterPoint, getAbsoluteAnchor } from '../utils/geometry';
import { ChevronRight, Home, HelpCircle } from 'lucide-react';

interface CanvasProps {
  nodes: NodeData[];
  links: LinkData[];
  roles: Role[];
  viewStack: { id: string, name: string }[];
  currentViewId: string | null;
  toolMode: ToolMode;
  selectedNodeIds: Set<string>;
  selectedLinkIds: Set<string>;
  
  onNodeMove: (id: string, x: number, y: number) => void;
  onNodeResize: (id: string, x: number, y: number, width: number, height: number) => void;
  onRoleResize: (id: string, newHeight: number) => void;
  onRoleReorder: (draggedRoleId: string, targetRoleId: string) => void;
  onAddLink: (sourceId: string, targetId: string) => void;
  onUpdateLink: (id: string, updates: Partial<LinkData>) => void;
  onSelectionChange: (nodeIds: string[], linkIds: string[]) => void;
  onNavigate: (viewId: string | null, name?: string) => void;
  onContextMenu: (state: ContextMenuState) => void;
  onBackgroundClick: (e: React.MouseEvent, x: number, y: number) => void;
  onDoubleClickHandler: (type: 'NODE' | 'LINK' | 'MAP', id?: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  nodes,
  links,
  roles,
  viewStack,
  currentViewId,
  toolMode,
  selectedNodeIds,
  selectedLinkIds,
  onNodeMove,
  onNodeResize,
  onRoleResize,
  onRoleReorder,
  onAddLink,
  onUpdateLink,
  onSelectionChange,
  onNavigate,
  onContextMenu,
  onBackgroundClick,
  onDoubleClickHandler
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [dragState, setDragState] = useState<{
    type: 'NODE' | 'ROLE_BORDER' | 'ROLE_HEADER' | 'SELECTION_BOX' | 'CONNECTING' | 'LINK_ANCHOR' | 'LINK_SEGMENT' | 'RESIZE' | null;
    targetId?: string; 
    handleType?: string; // for LINK_ANCHOR or RESIZE
    startX: number;
    startY: number;
    initialData?: any;
    currentX?: number; 
    currentY?: number;
  }>({ type: null, startX: 0, startY: 0 });

  const visibleNodes = nodes.filter(n => n.parentId === currentViewId);
  const visibleLinks = links.filter(l => l.parentId === currentViewId);

  // --- Helpers ---
  
  // Helper to calculate handle positions for rendering (LOCAL COORDINATES)
  const getLocalHandlePos = (width: number, height: number, h: ResizeHandle): Coordinates => {
      switch(h) {
          case 'nw': return { x: 0, y: 0 };
          case 'n': return { x: width/2, y: 0 };
          case 'ne': return { x: width, y: 0 };
          case 'e': return { x: width, y: height/2 };
          case 'se': return { x: width, y: height };
          case 's': return { x: width/2, y: height };
          case 'sw': return { x: 0, y: height };
          case 'w': return { x: 0, y: height/2 };
      }
  };

  // Helper to calculate handle positions for Hit Testing (GLOBAL COORDINATES)
  const getGlobalHandlePos = (node: NodeData, h: ResizeHandle): Coordinates => {
      const local = getLocalHandlePos(node.width, node.height, h);
      return { x: node.x + local.x, y: node.y + local.y };
  };

  // Helper to flatten roles with hierarchy for linear Y layout
  const getFlattenedRoleLayout = (allRoles: Role[]) => {
      const result: { role: Role, level: number }[] = [];
      const traverse = (parentId: string | null, level: number) => {
          const children = allRoles.filter(r => r.parentId === (parentId || null)).sort((a,b) => a.order - b.order);
          children.forEach(r => {
              result.push({ role: r, level });
              traverse(r.id, level + 1);
          });
      };
      traverse(null, 0);
      return result;
  };

  const getSVGPoint = (e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM()?.inverse());
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; 
    const svgP = getSVGPoint(e);
    
    // 1. Check Resize Handles (if one node selected)
    if (selectedNodeIds.size === 1) {
        const nodeId = Array.from(selectedNodeIds)[0];
        const node = visibleNodes.find(n => n.id === nodeId);
        if (node) {
             const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
             for (const h of handles) {
                 // Use Global Coordinates for Hit Test
                 const hPos = getGlobalHandlePos(node, h as ResizeHandle);
                 
                 // Hit area for resize handles
                 if (Math.hypot(svgP.x - hPos.x, svgP.y - hPos.y) < 8) {
                     setDragState({
                         type: 'RESIZE',
                         targetId: nodeId,
                         handleType: h,
                         startX: svgP.x,
                         startY: svgP.y,
                         initialData: { x: node.x, y: node.y, width: node.width, height: node.height }
                     });
                     e.stopPropagation(); return;
                 }
             }
        }
    }

    // 2. Check Link Anchors AND Segments
    if (selectedLinkIds.size === 1) {
        const linkId = Array.from(selectedLinkIds)[0];
        const link = visibleLinks.find(l => l.id === linkId);
        if (link) {
            const sourceNode = nodes.find(n => n.id === link.sourceId);
            const targetNode = nodes.find(n => n.id === link.targetId);
            if (sourceNode && targetNode) {
                // Anchors
                const startPos = getAbsoluteAnchor(sourceNode, link.sourceAnchor);
                const endPos = getAbsoluteAnchor(targetNode, link.targetAnchor);
                
                if (Math.hypot(svgP.x - startPos.x, svgP.y - startPos.y) < 10) {
                     setDragState({ type: 'LINK_ANCHOR', targetId: link.id, handleType: 'source', startX: svgP.x, startY: svgP.y });
                     e.stopPropagation(); return;
                }
                if (Math.hypot(svgP.x - endPos.x, svgP.y - endPos.y) < 10) {
                     setDragState({ type: 'LINK_ANCHOR', targetId: link.id, handleType: 'target', startX: svgP.x, startY: svgP.y });
                     e.stopPropagation(); return;
                }

                // Segments for Elbow - Pass visibleNodes for obstacle avoidance
                const { segmentHandle, segmentType } = getLinkPathInfo(sourceNode, targetNode, link, visibleNodes);
                if (segmentHandle && Math.hypot(svgP.x - segmentHandle.x, svgP.y - segmentHandle.y) < 8) {
                     setDragState({
                         type: 'LINK_SEGMENT',
                         targetId: link.id,
                         handleType: segmentType, // 'horizontal' or 'vertical' drag
                         startX: svgP.x,
                         startY: svgP.y,
                         initialData: { controlPoint: link.controlPoints?.[0] ?? (segmentType === 'vertical' ? segmentHandle.x : segmentHandle.y) }
                     });
                     e.stopPropagation(); return;
                }
            }
        }
    }

    // 3. Check Nodes
    const clickedNode = [...visibleNodes].reverse().find(n => 
      isPointInRect(svgP.x, svgP.y, { x: n.x, y: n.y, width: n.width, height: n.height })
    );

    if (clickedNode) {
      if (toolMode.startsWith('CONNECT')) {
        setDragState({
          type: 'CONNECTING',
          targetId: clickedNode.id,
          startX: svgP.x,
          startY: svgP.y,
          currentX: svgP.x,
          currentY: svgP.y
        });
      } else {
        const alreadySelected = selectedNodeIds.has(clickedNode.id);
        
        let newSelection = new Set(selectedNodeIds);
        if (e.ctrlKey) {
            if (alreadySelected) newSelection.delete(clickedNode.id);
            else newSelection.add(clickedNode.id);
        } else {
            if (!alreadySelected) {
                newSelection = new Set([clickedNode.id]);
            }
        }

        onSelectionChange(Array.from(newSelection), []);

        if (newSelection.has(clickedNode.id)) {
            setDragState({
            type: 'NODE',
            targetId: clickedNode.id, 
            startX: svgP.x,
            startY: svgP.y,
            initialData: { 
                nodes: Array.from(newSelection).map(id => {
                    const n = nodes.find(x => x.id === id);
                    return { id, x: n?.x || 0, y: n?.y || 0 };
                })
            }
            });
        }
      }
      e.stopPropagation();
      return;
    }

    // 4. Check Roles
    let currentY = 0;
    const flatRoleList = getFlattenedRoleLayout(roles);
    
    for (const item of flatRoleList) {
        // Header
        if (svgP.x < 40 && svgP.y >= currentY && svgP.y <= currentY + item.role.height) {
             setDragState({
                type: 'ROLE_HEADER',
                targetId: item.role.id,
                startX: svgP.x,
                startY: svgP.y
             });
             e.stopPropagation(); return;
        }
        
        currentY += item.role.height;
        // Border
        if (Math.abs(svgP.y - currentY) < 6) {
             setDragState({
                type: 'ROLE_BORDER',
                targetId: item.role.id,
                startX: svgP.x,
                startY: svgP.y,
                initialData: { height: item.role.height }
            });
            e.stopPropagation(); return;
        }
    }

    // 5. Background
    onBackgroundClick(e, svgP.x, svgP.y);
    if (!toolMode.startsWith('CREATE')) {
         setDragState({
            type: 'SELECTION_BOX',
            startX: svgP.x,
            startY: svgP.y,
            currentX: svgP.x,
            currentY: svgP.y
        });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.type) return;
    const svgP = getSVGPoint(e);
    const dx = svgP.x - dragState.startX;
    const dy = svgP.y - dragState.startY;

    if (dragState.type === 'NODE' && dragState.initialData) {
      dragState.initialData.nodes.forEach((item: any) => {
          onNodeMove(item.id, item.x + dx, item.y + dy);
      });
    } else if (dragState.type === 'RESIZE' && dragState.targetId) {
        const { x, y, width, height } = dragState.initialData;
        let nx = x, ny = y, nw = width, nh = height;
        const h = dragState.handleType;
        
        if (h?.includes('e')) nw = Math.max(20, width + dx);
        if (h?.includes('s')) nh = Math.max(20, height + dy);
        if (h?.includes('w')) { nx = x + dx; nw = Math.max(20, width - dx); }
        if (h?.includes('n')) { ny = y + dy; nh = Math.max(20, height - dy); }
        
        onNodeResize(dragState.targetId, nx, ny, nw, nh);
    } else if (dragState.type === 'ROLE_BORDER' && dragState.targetId) {
      const newHeight = Math.max(50, dragState.initialData.height + dy);
      onRoleResize(dragState.targetId, newHeight);
    } else if (dragState.type === 'CONNECTING' || dragState.type === 'SELECTION_BOX') {
      setDragState(prev => ({ ...prev, currentX: svgP.x, currentY: svgP.y }));
    } else if (dragState.type === 'LINK_ANCHOR' && dragState.targetId) {
       const link = visibleLinks.find(l => l.id === dragState.targetId);
       if (link) {
           const nodeId = dragState.handleType === 'source' ? link.sourceId : link.targetId;
           const node = nodes.find(n => n.id === nodeId);
           if (node) {
               // Allow snapping to any point on perimeter
               const relativePos = getNearestPerimeterPoint(node, svgP.x, svgP.y);
               const updates = dragState.handleType === 'source' ? { sourceAnchor: relativePos } : { targetAnchor: relativePos };
               onUpdateLink(link.id, updates);
           }
       }
    } else if (dragState.type === 'LINK_SEGMENT' && dragState.targetId) {
        // Update control point based on axis
        const newVal = dragState.handleType === 'vertical' 
            ? dragState.initialData.controlPoint + dx 
            : dragState.initialData.controlPoint + dy;
        onUpdateLink(dragState.targetId, { controlPoints: [newVal] });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const svgP = getSVGPoint(e);

    if (dragState.type === 'CONNECTING') {
        const targetNode = visibleNodes.find(n => 
          isPointInRect(svgP.x, svgP.y, { x: n.x, y: n.y, width: n.width, height: n.height })
        );
        if (targetNode && targetNode.id !== dragState.targetId) {
          onAddLink(dragState.targetId!, targetNode.id);
        }
    } else if (dragState.type === 'SELECTION_BOX') {
        const x = Math.min(dragState.startX, dragState.currentX || 0);
        const y = Math.min(dragState.startY, dragState.currentY || 0);
        const w = Math.abs((dragState.currentX || 0) - dragState.startX);
        const h = Math.abs((dragState.currentY || 0) - dragState.startY);
        
        const containedNodes = visibleNodes.filter(n => 
            n.x >= x && n.x + n.width <= x + w &&
            n.y >= y && n.y + n.height <= y + h
        );
        
        let newSelection = new Set(selectedNodeIds);
        if (!e.ctrlKey) newSelection.clear();
        
        containedNodes.forEach(n => newSelection.add(n.id));
        onSelectionChange(Array.from(newSelection), []);
    } else if (dragState.type === 'ROLE_HEADER' && dragState.targetId) {
         const flatList = getFlattenedRoleLayout(roles);
         let currentY = 0;
         for (const item of flatList) {
             if (svgP.y >= currentY && svgP.y <= currentY + item.role.height) {
                 if (item.role.id !== dragState.targetId) {
                     onRoleReorder(dragState.targetId, item.role.id);
                 }
                 break;
             }
             currentY += item.role.height;
         }
    }
    
    setDragState({ type: null, startX: 0, startY: 0 });
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'CANVAS' | 'NODE' | 'LINK' | 'ROLE', id?: string) => {
    e.preventDefault();
    onContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      targetType: type,
      targetId: id
    });
  };

  // --- Renderers ---

  const renderRoles = () => {
    const layout = getFlattenedRoleLayout(roles);
    let currentY = 0;
    
    return layout.map((item) => {
      const { role, level } = item;
      const el = (
        <g 
            key={role.id} 
            transform={`translate(0, ${currentY})`}
            onContextMenu={(e) => handleContextMenu(e, 'ROLE', role.id)}
        >
          {/* Main Background */}
          <rect 
            width="100%" 
            height={role.height} 
            fill={role.color || (level % 2 === 0 ? '#f9fafb' : '#ffffff')} 
            stroke="#e5e7eb"
          />
          
          {/* Visual Indentation for Sub-Actors */}
          {level > 0 && (
             <rect width={level * 20} height={role.height} fill="#e5e7eb" opacity="0.5" />
          )}

          {/* Drag Handle Area */}
          <rect 
            x={level * 20}
            width="40" 
            height={role.height} 
            fill="rgba(0,0,0,0.02)" 
            className="cursor-move hover:fill-blue-50" 
             onMouseDown={(e) => {
                 setDragState({ type: 'ROLE_HEADER', targetId: role.id, startX: e.clientX, startY: e.clientY });
                 e.stopPropagation();
             }}
          />
          
          {/* Label */}
          <text 
             x={(level * 20) + 10} 
             y="20" 
             fill={role.textColor || "#9ca3af"}
             className="text-xs font-bold select-none pointer-events-none"
          >
            {role.name}
          </text>
          
          {/* Resize Handle */}
          <line 
            x1="0" y1={role.height} x2="100%" y2={role.height} 
            stroke="transparent" strokeWidth="8" 
            className="cursor-ns-resize hover:stroke-blue-300/50"
          />
        </g>
      );
      currentY += role.height;
      return el;
    });
  };

  const renderNode = (node: NodeData) => {
    const isSelected = selectedNodeIds.has(node.id);
    const commonProps = {
      stroke: isSelected ? '#2563eb' : (node.borderColor || '#374151'),
      strokeWidth: isSelected ? 2 : 1,
      fill: node.backgroundColor || 'white',
      className: "cursor-move transition-colors duration-200"
    };

    // Render Resize Handles ON the border (using LOCAL coordinates relative to node group)
    const renderResizeHandles = () => {
        if (!isSelected) return null;
        const handles: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
        return handles.map(h => {
            const pos = getLocalHandlePos(node.width, node.height, h);
            return (
                <rect 
                    key={h}
                    x={pos.x - 4} y={pos.y - 4} width={8} height={8}
                    fill="white" stroke="#2563eb" strokeWidth={1}
                    className="cursor-pointer hover:fill-blue-100 z-50"
                />
            );
        });
    };

    let shape;
    let textContent;
    const textColor = node.textColor || '#1f2937';

    if (node.type === NodeType.UNIT_PROCESS) {
        shape = (
            <g>
                <rect width={node.width} height={node.height} rx={4} {...commonProps} />
                <line x1={0} y1={24} x2={node.width} y2={24} stroke={commonProps.stroke} strokeWidth={1} />
            </g>
        );
        textContent = (
             <foreignObject width={node.width} height={node.height} className="pointer-events-none">
                <div className="w-full h-full flex flex-col">
                    <div className="h-6 flex items-center justify-center text-[10px] font-bold text-gray-600 bg-gray-50/50 rounded-t">
                        {node.processId}
                    </div>
                    <div className="flex-1 flex items-center justify-center p-1 text-center overflow-hidden">
                        <span className="text-xs font-medium break-words leading-tight" style={{ color: textColor }}>{node.label}</span>
                    </div>
                </div>
            </foreignObject>
        );
    } else if (node.type === NodeType.DECISION) {
      shape = (
        <polygon 
          points={`${node.width/2},0 ${node.width},${node.height/2} ${node.width/2},${node.height} 0,${node.height/2}`}
          {...commonProps}
          fill={node.backgroundColor || '#fef3c7'}
        />
      );
      textContent = (
         <foreignObject width={node.width} height={node.height} className="pointer-events-none">
             <div className="w-full h-full flex items-center justify-center p-4 text-center">
                 <span className="text-xs font-medium leading-tight" style={{ color: textColor }}>{node.label}</span>
             </div>
         </foreignObject>
      );
    } else if (node.type === NodeType.GROUP_DIVISION) {
       shape = (
        <rect 
          width={node.width} height={node.height} {...commonProps}
          fill="none" strokeDasharray="4 4" stroke="#9ca3af"
        />
      );
      textContent = <text x="5" y="15" className="text-xs font-bold pointer-events-none" fill={textColor}>{node.label}</text>;
    } else if (node.type === NodeType.HELP) {
       if (node.helpVisible) {
           shape = (
            <g>
                <rect width={node.width} height={node.height} rx={4} fill="#eff6ff" stroke="#60a5fa" />
                <foreignObject width={node.width} height={node.height}>
                    <div className="p-2 text-xs overflow-auto h-full" style={{ color: textColor || '#1e40af' }}>
                        <span className="font-bold block mb-1">Help</span>
                        {node.description || 'No description'}
                    </div>
                </foreignObject>
            </g>
           );
       } else {
           shape = (
               <g>
                   <circle cx={node.width/2} cy={node.height/2} r={20} fill="#dbeafe" stroke="#2563eb" strokeWidth={1} />
                   <text x={node.width/2} y={node.height/2} dy="6" textAnchor="middle" className="text-lg font-bold fill-blue-600">?</text>
               </g>
           );
       }
    } else if (node.type === NodeType.START) {
        shape = (
            <g>
                <circle cx={node.width/2} cy={node.height/2} r={Math.min(node.width, node.height)/2} {...commonProps} fill={node.backgroundColor || '#dcfce7'} stroke={node.borderColor || '#166534'} />
            </g>
        );
        textContent = <text x={node.width/2} y={node.height/2} dy="4" textAnchor="middle" className="text-xs font-bold pointer-events-none" fill={textColor}>Start</text>;
    } else if (node.type === NodeType.END) {
        shape = (
            <g>
                <circle cx={node.width/2} cy={node.height/2} r={Math.min(node.width, node.height)/2} {...commonProps} fill={node.backgroundColor || '#fee2e2'} stroke={node.borderColor || '#991b1b'} strokeWidth={3} />
            </g>
        );
        textContent = <text x={node.width/2} y={node.height/2} dy="4" textAnchor="middle" className="text-xs font-bold pointer-events-none" fill={textColor}>End</text>;
    } else {
      shape = <rect width={node.width} height={node.height} rx={4} {...commonProps} fill={node.backgroundColor || (node.type === NodeType.GROUP_PROCESS ? '#f3f4f6' : 'white')} />;
      textContent = (
           <foreignObject width={node.width} height={node.height} className="pointer-events-none">
             <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center overflow-hidden">
                <span className="text-xs font-medium break-words w-full leading-tight" style={{ color: textColor }}>{node.label}</span>
                {node.type === NodeType.GROUP_PROCESS && (
                   <div className="absolute bottom-1 right-1 text-gray-400">
                     <span className="text-[10px] bg-gray-200 rounded-full w-4 h-4 flex items-center justify-center">+</span>
                   </div>
                )}
             </div>
           </foreignObject>
        );
    }

    return (
      <g 
        key={node.id} 
        transform={`translate(${node.x}, ${node.y})`}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClickHandler('NODE', node.id); }}
        onContextMenu={(e) => handleContextMenu(e, 'NODE', node.id)}
      >
        {shape}
        {textContent}
        {renderResizeHandles()}
      </g>
    );
  };

  const renderLink = (link: LinkData) => {
    const source = nodes.find(n => n.id === link.sourceId);
    const target = nodes.find(n => n.id === link.targetId);
    if (!source || !target) return null;

    const { path, segmentHandle } = getLinkPathInfo(source, target, link, visibleNodes);
    const isSelected = selectedLinkIds.has(link.id);

    const startPos = isSelected ? getAbsoluteAnchor(source, link.sourceAnchor) : null;
    const endPos = isSelected ? getAbsoluteAnchor(target, link.targetAnchor) : null;

    return (
      <g 
        key={link.id} 
        onClick={(e) => { e.stopPropagation(); onSelectionChange([], [link.id]); }}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClickHandler('LINK', link.id); }}
        onContextMenu={(e) => handleContextMenu(e, 'LINK', link.id)}
        className="group cursor-pointer"
      >
        {/* Thick transparent hit target */}
        <path d={path} stroke="transparent" strokeWidth="12" fill="none" />
        
        {/* Visible line */}
        <path 
          d={path} 
          stroke={isSelected ? '#2563eb' : link.color} 
          strokeWidth={2} 
          fill="none"
          strokeDasharray={link.style === LineStyle.DASHED ? "5,5" : link.style === LineStyle.DOTTED ? "2,2" : "none"}
          markerEnd={`url(#marker-${link.endMarker}-${isSelected ? 'selected' : 'normal'}-${link.color.replace('#','')})`}
          markerStart={link.startMarker !== 'NONE' ? `url(#marker-${link.startMarker}-${isSelected ? 'selected' : 'normal'}-${link.color.replace('#','')})` : undefined}
        />
        {link.label && (
           <text className="text-xs fill-gray-600 font-medium" textAnchor="middle">
             <textPath href={`#path-${link.id}`} startOffset="50%">
                {link.label}
             </textPath>
           </text>
        )}
        <path id={`path-${link.id}`} d={path} fill="none" stroke="none" />

        {/* Anchor Handles */}
        {isSelected && startPos && (
             <circle cx={startPos.x} cy={startPos.y} r={4} fill="#2563eb" stroke="white" strokeWidth={1} className="cursor-crosshair z-50" />
        )}
        {isSelected && endPos && (
             <circle cx={endPos.x} cy={endPos.y} r={4} fill="#2563eb" stroke="white" strokeWidth={1} className="cursor-crosshair z-50" />
        )}

        {/* Path Segment Adjustment Handle */}
        {isSelected && segmentHandle && (
            <circle cx={segmentHandle.x} cy={segmentHandle.y} r={4} fill="#f59e0b" stroke="white" strokeWidth={1} className="cursor-ew-resize z-50" />
        )}
      </g>
    );
  };

  const Defs = () => {
      const uniqueColors = Array.from(new Set(['#6b7280', '#2563eb', ...visibleLinks.map(l => l.color)]));
      
      return (
        <defs>
            {uniqueColors.map(c => {
                const safeC = c.replace('#','');
                return (
                <React.Fragment key={c}>
                    <marker id={`marker-ARROW-normal-${safeC}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill={c} />
                    </marker>
                    <marker id={`marker-ARROW-selected-${safeC}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill="#2563eb" />
                    </marker>
                    
                    <marker id={`marker-TRIANGLE_FILLED-normal-${safeC}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill={c} />
                    </marker>
                    <marker id={`marker-TRIANGLE_FILLED-selected-${safeC}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill="#2563eb" />
                    </marker>

                    <marker id={`marker-TRIANGLE_EMPTY-normal-${safeC}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill="white" stroke={c} />
                    </marker>
                    <marker id={`marker-TRIANGLE_EMPTY-selected-${safeC}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L9,3 z" fill="white" stroke="#2563eb" />
                    </marker>

                    {/* Circle */}
                    <marker id={`marker-CIRCLE-normal-${safeC}`} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                        <circle cx="4" cy="4" r="3" fill={c} />
                    </marker>
                     <marker id={`marker-CIRCLE-selected-${safeC}`} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                        <circle cx="4" cy="4" r="3" fill="#2563eb" />
                    </marker>
                </React.Fragment>
                );
            })}
        </defs>
      );
  };

  return (
    <div className="flex-1 h-full bg-white relative overflow-hidden flex flex-col">
      {/* Breadcrumbs */}
      <div className="h-8 bg-gray-50 border-b border-gray-200 flex items-center px-4 text-xs text-gray-600 shrink-0">
        <button className="flex items-center hover:text-blue-600" onClick={() => onNavigate(null)}>
          <Home size={12} className="mr-1" /> Root
        </button>
        {viewStack.map((view, idx) => (
          <React.Fragment key={view.id}>
            <ChevronRight size={12} className="mx-1 text-gray-400" />
            <button 
              className={`hover:text-blue-600 ${idx === viewStack.length -1 ? 'font-bold text-gray-800' : ''}`}
              onClick={() => onNavigate(view.id)}
            >
              {view.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 overflow-auto relative bg-gray-100">
        <svg 
          ref={svgRef}
          className="w-[3000px] h-[3000px] block bg-white shadow-sm m-8"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={(e) => handleContextMenu(e, 'CANVAS')}
          onDoubleClick={() => onDoubleClickHandler('MAP')}
        >
          <Defs />
          <g className="roles-layer">{renderRoles()}</g>
          <g className="divisions-layer">
            {visibleNodes.filter(n => n.type === NodeType.GROUP_DIVISION).map(renderNode)}
          </g>
          <g className="links-layer">
            {visibleLinks.map(renderLink)}
            {dragState.type === 'CONNECTING' && dragState.currentX && (
              <line 
                x1={dragState.startX} y1={dragState.startY} 
                x2={dragState.currentX} y2={dragState.currentY} 
                stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" 
              />
            )}
          </g>
          <g className="nodes-layer">
            {visibleNodes.filter(n => n.type !== NodeType.GROUP_DIVISION).map(renderNode)}
          </g>
          
          {dragState.type === 'SELECTION_BOX' && dragState.currentX && (
              <rect 
                x={Math.min(dragState.startX, dragState.currentX)}
                y={Math.min(dragState.startY, dragState.currentY)}
                width={Math.abs(dragState.currentX - dragState.startX)}
                height={Math.abs(dragState.currentY - dragState.startY)}
                fill="rgba(59, 130, 246, 0.1)"
                stroke="#3b82f6"
                strokeWidth="1"
              />
          )}
        </svg>
      </div>
    </div>
  );
};