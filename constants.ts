
import { LinkType, LineStyle, ArrowShape, NodeType } from './types';

export const DEFAULT_NODE_SIZE = {
  [NodeType.UNIT_PROCESS]: { width: 140, height: 70 },
  [NodeType.GROUP_PROCESS]: { width: 160, height: 90 },
  [NodeType.GROUP_DIVISION]: { width: 300, height: 200 },
  [NodeType.DECISION]: { width: 100, height: 80 },
  [NodeType.HELP]: { width: 120, height: 60 },
  [NodeType.START]: { width: 60, height: 60 },
  [NodeType.END]: { width: 60, height: 60 },
};

export const COLORS = {
  selection: '#3b82f6',
  grid: '#e5e7eb',
  nodeBorder: '#374151',
  linkDefault: '#6b7280',
};

export const DEFAULT_NEW_LINK = {
  type: LinkType.ELBOW,
  style: LineStyle.SOLID,
  color: COLORS.linkDefault,
  startMarker: ArrowShape.NONE,
  endMarker: ArrowShape.ARROW,
};

export const MOCK_INITIAL_DATA = {
  id: 'root-map',
  name: 'Main Process Map',
  description: 'Overview of the core business logic.',
  nodes: [],
  links: [],
  roles: [
    { id: 'role-1', name: 'User', height: 200, order: 0 },
    { id: 'role-2', name: 'System', height: 200, order: 1 },
    { id: 'role-3', name: 'Administrator', height: 200, order: 2 },
  ],
};
