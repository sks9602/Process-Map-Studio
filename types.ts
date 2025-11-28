
export enum NodeType {
  UNIT_PROCESS = 'UNIT_PROCESS',
  GROUP_PROCESS = 'GROUP_PROCESS',
  GROUP_DIVISION = 'GROUP_DIVISION',
  DECISION = 'DECISION',
  HELP = 'HELP',
  START = 'START',
  END = 'END',
}

export enum LinkType {
  STRAIGHT = 'STRAIGHT',
  ELBOW = 'ELBOW',
}

export enum LineStyle {
  SOLID = 'SOLID',
  DASHED = 'DASHED',
  DOTTED = 'DOTTED',
}

export enum ArrowShape {
  NONE = 'NONE',
  ARROW = 'ARROW',
  TRIANGLE_EMPTY = 'TRIANGLE_EMPTY',
  TRIANGLE_FILLED = 'TRIANGLE_FILLED',
  CIRCLE = 'CIRCLE',
}

export interface Coordinates {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Role {
  id: string;
  name: string;
  height: number;
  order: number;
  color?: string;
  textColor?: string;
  parentId?: string | null; // For tree hierarchy
}

export interface NodeData {
  id: string;
  type: NodeType;
  parentId: string | null; // null for root level
  x: number;
  y: number;
  width: number;
  height: number;
  label: string; // Process Name or Condition Name
  processId?: string; // Visible ID (e.g., P-001)
  description?: string;
  url?: string;
  // Specific styling or state
  borderColor?: string;
  backgroundColor?: string;
  textColor?: string;
  helpVisible?: boolean; // For Help nodes
}

export interface LinkData {
  id: string;
  sourceId: string;
  targetId: string;
  parentId: string | null; // Should belong to the same view level
  type: LinkType;
  style: LineStyle;
  color: string;
  startMarker: ArrowShape;
  endMarker: ArrowShape;
  label?: string; // Condition text
  description?: string;
  // Relative coordinates (0-1) for anchors. If undefined, defaults to smart centering.
  sourceAnchor?: Coordinates;
  targetAnchor?: Coordinates;
  // For manual routing adjustments.
  // For Elbow: [segmentPosition] - usually a single value indicating the offset of the perpendicular segment
  controlPoints?: number[]; 
}

export interface DiagramData {
  id: string;
  name: string;
  description: string;
  nodes: NodeData[];
  links: LinkData[];
  roles: Role[];
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetId?: string; // ID of the element clicked
  targetType?: 'CANVAS' | 'NODE' | 'LINK' | 'ROLE' | 'MINIMAP';
  diagramId?: string; // For SidebarLeft context
}

// Expanded ToolMode to include creation states
export type ToolMode = 
  | 'SELECT' 
  | 'CONNECT_STRAIGHT' 
  | 'CONNECT_ELBOW'
  | 'CREATE_UNIT_PROCESS'
  | 'CREATE_GROUP_PROCESS'
  | 'CREATE_GROUP_DIVISION'
  | 'CREATE_DECISION'
  | 'CREATE_HELP'
  | 'CREATE_START'
  | 'CREATE_END';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
