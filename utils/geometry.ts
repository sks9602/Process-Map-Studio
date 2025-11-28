
import { Coordinates, LinkType, NodeData, NodeType } from '../types';

export const getCenter = (node: NodeData): Coordinates => {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
};

export const getAbsoluteAnchor = (node: NodeData, relative: Coordinates | undefined): Coordinates => {
  if (!relative) return getCenter(node);
  return {
    x: node.x + node.width * relative.x,
    y: node.y + node.height * relative.y
  };
};

// Helper to determine which side of the node the anchor is on
const getAnchorSide = (rel: Coordinates): 'top' | 'bottom' | 'left' | 'right' => {
  if (rel.x <= 0.05) return 'left';
  if (rel.x >= 0.95) return 'right';
  if (rel.y <= 0.05) return 'top';
  if (rel.y >= 0.95) return 'bottom';
  return 'bottom'; // Default
};

export const getSmartElbowPath = (
  start: Coordinates, 
  end: Coordinates, 
  startSide: 'top'|'bottom'|'left'|'right', 
  endSide: 'top'|'bottom'|'left'|'right',
  controlPoint?: number // Drag offset
): { path: string, segmentHandle?: Coordinates, segmentType?: 'vertical' | 'horizontal' } => {
  
  let path = '';
  let segmentHandle: Coordinates | undefined;
  let segmentType: 'vertical' | 'horizontal' | undefined;

  // Simple heuristics for flowchart routing
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  
  // Logic mostly for Right -> Left flows or Top -> Bottom flows
  if ((startSide === 'right' && endSide === 'left') || (startSide === 'left' && endSide === 'right')) {
    // Horizontal flow
    let midX = start.x + dx / 2;
    if (controlPoint !== undefined) midX = controlPoint;
    
    path = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
    segmentHandle = { x: midX, y: (start.y + end.y) / 2 };
    segmentType = 'vertical'; // The middle segment is vertical
    
  } else if ((startSide === 'bottom' && endSide === 'top') || (startSide === 'top' && endSide === 'bottom')) {
    // Vertical flow
    let midY = start.y + dy / 2;
    if (controlPoint !== undefined) midY = controlPoint;

    path = `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;
    segmentHandle = { x: (start.x + end.x) / 2, y: midY };
    segmentType = 'horizontal'; // The middle segment is horizontal

  } else if (startSide === 'right' || startSide === 'left') {
    // Exiting horizontally, but not direct opposite
    // Go out, then vertical, then to target
    let midX = start.x + (dx/2);
    // If control point provided, use it as the vertical channel X
    if (controlPoint !== undefined) midX = controlPoint;
    
    path = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
    segmentHandle = { x: midX, y: (start.y + end.y) / 2 };
    segmentType = 'vertical';

  } else {
    // Exiting vertically (Top/Bottom)
    let midY = start.y + (dy/2);
    if (controlPoint !== undefined) midY = controlPoint;
    
    path = `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;
    segmentHandle = { x: (start.x + end.x) / 2, y: midY };
    segmentType = 'horizontal';
  }

  return { path, segmentHandle, segmentType };
};

export const getStraightPath = (start: Coordinates, end: Coordinates): string => {
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
};

export const getLinkPathInfo = (
  source: NodeData, 
  target: NodeData, 
  link: { type: LinkType, sourceAnchor?: Coordinates, targetAnchor?: Coordinates, controlPoints?: number[] },
  nodes?: NodeData[]
): { path: string, segmentHandle?: Coordinates, segmentType?: 'vertical' | 'horizontal' } => {
  
  // Default anchors if not set
  const sAnchorRel = link.sourceAnchor || { x: 1, y: 0.5 }; // Default right
  const tAnchorRel = link.targetAnchor || { x: 0, y: 0.5 }; // Default left

  const start = getAbsoluteAnchor(source, sAnchorRel);
  const end = getAbsoluteAnchor(target, tAnchorRel);

  if (link.type === LinkType.STRAIGHT) {
    return { path: getStraightPath(start, end) };
  }

  const startSide = getAnchorSide(sAnchorRel);
  const endSide = getAnchorSide(tAnchorRel);
  
  // Control point 0 usually overrides the primary mid-segment
  const cp = link.controlPoints?.[0];

  return getSmartElbowPath(start, end, startSide, endSide, cp);
};

export const getLinkPath = (source: NodeData, target: NodeData, type: LinkType, sourceAnchor?: Coordinates, targetAnchor?: Coordinates, controlPoints?: number[]) => {
    return getLinkPathInfo(source, target, { type, sourceAnchor, targetAnchor, controlPoints }).path;
};

// Check if a point is inside a rectangle
export const isPointInRect = (x: number, y: number, rect: { x: number, y: number, width: number, height: number }) => {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
};

// Get the nearest point on the perimeter of a rectangle to a given point
export const getNearestPerimeterPoint = (node: NodeData, x: number, y: number): Coordinates => {
  const relX = (x - node.x) / node.width;
  const relY = (y - node.y) / node.height;

  // Clamp to 0-1
  const clampedX = Math.max(0, Math.min(1, relX));
  const clampedY = Math.max(0, Math.min(1, relY));

  // Determine closest edge
  const distToLeft = clampedX;
  const distToRight = 1 - clampedX;
  const distToTop = clampedY;
  const distToBottom = 1 - clampedY;

  const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

  let finalX = clampedX;
  let finalY = clampedY;

  if (node.type === NodeType.DECISION) {
    // Diamond logic: Snap to 4 vertices
    const vertices = [
      { x: 0.5, y: 0 },
      { x: 1, y: 0.5 },
      { x: 0.5, y: 1 },
      { x: 0, y: 0.5 }
    ];
    let bestV = vertices[0];
    let bestDist = 999999;
    vertices.forEach(v => {
      const d = Math.pow(v.x - clampedX, 2) + Math.pow(v.y - clampedY, 2);
      if (d < bestDist) {
        bestDist = d;
        bestV = v;
      }
    });
    return bestV;
  }

  // Rectangle logic: Snap to border, but allow sliding along it
  if (minDist === distToLeft) finalX = 0;
  else if (minDist === distToRight) finalX = 1;
  else if (minDist === distToTop) finalY = 0;
  else if (minDist === distToBottom) finalY = 1;

  return { x: finalX, y: finalY };
};