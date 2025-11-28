import React from 'react';
import { 
  Square, 
  Layers, 
  LayoutTemplate, 
  GitFork, 
  HelpCircle, 
  Plus, 
  Users, 
  PlayCircle, 
  StopCircle, 
  Download, 
  Upload, 
  FilePlus,
  AlignStartVertical,
  AlignEndVertical,
  AlignCenterVertical,
  AlignStartHorizontal,
  AlignEndHorizontal,
  AlignCenterHorizontal
} from 'lucide-react';
import { ToolMode, LineStyle, ArrowShape } from '../types';

interface ToolbarProps {
  onSetTool: (mode: ToolMode) => void;
  onAddProcessMap: () => void;
  onManageActors: () => void;
  currentTool: ToolMode;
  onAlign: (alignment: string) => void;
  onColorChange: (type: 'fill' | 'stroke', color: string) => void;
  onLineStyleChange: (style: LineStyle) => void;
  onArrowShapeChange: (shape: ArrowShape) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

const ButtonGroup = ({ children, label }: { children?: React.ReactNode, label: string }) => (
  <div className="flex flex-col mx-2 h-full justify-center">
    <div className="flex items-center space-x-1 bg-gray-50 p-1 rounded-md border border-gray-200 h-9">
      {children}
    </div>
    <span className="text-[10px] text-center text-gray-500 mt-0.5">{label}</span>
  </div>
);

const ToolBtn = ({ 
  onClick, 
  icon: Icon, 
  active = false, 
  title,
  label
}: { 
  onClick: () => void; 
  icon: React.ElementType; 
  active?: boolean; 
  title: string;
  label?: string; 
}) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded flex items-center justify-center hover:bg-white hover:shadow-sm transition-all h-7 ${
      active ? 'bg-blue-100 text-blue-700 shadow-inner' : 'text-gray-600 hover:text-gray-900'
    }`}
  >
    <Icon size={18} />
    {label && <span className="ml-1 text-xs font-medium">{label}</span>}
  </button>
);

// --- Custom SVGs for Specific Requirements ---

const ElbowIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4v8h16v8" />
    </svg>
);

const StraightIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="20" x2="20" y2="4" />
    </svg>
);

const SolidLineIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
);

const DashedLineIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12h4 M10 12h4 M18 12h4" />
    </svg>
);

const DottedLineIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12h2 M7 12h2 M12 12h2 M17 12h2 M22 12h2" />
    </svg>
);

const ArrowEndIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12h16 M15 5l7 7-7 7" />
    </svg>
);

const TriangleFilledEndIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M20 12L4 4v16z" /> 
    </svg>
);

const TriangleEmptyEndIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 12L4 4v16z" />
    </svg>
);

export const Toolbar: React.FC<ToolbarProps> = ({ 
  onSetTool, 
  onAddProcessMap, 
  onManageActors,
  currentTool, 
  onAlign,
  onColorChange,
  onLineStyleChange,
  onArrowShapeChange,
  onExport,
  onImport
}) => {
  return (
    <div className="h-20 bg-white border-b border-gray-200 flex items-center px-4 shadow-sm w-full overflow-x-auto z-50">
      
      <div className="flex items-center h-full">
        <h1 className="text-xl font-bold text-gray-800 mr-6 tracking-tight">PMS</h1>
        
         {/* Data */}
        <ButtonGroup label="Data">
           <ToolBtn onClick={onExport} icon={Download} title="Export" />
           <ToolBtn onClick={() => {}} icon={Upload} title="Import" />
           {/* Hidden input hack handled by parent ref trigger but simplistic here */}
           <input 
              type="file" 
              className="hidden" 
              accept=".json"
              onChange={(e) => {
                  if (e.target.files?.[0]) onImport(e.target.files[0]);
              }}
           />
        </ButtonGroup>
        
        <div className="w-px h-10 bg-gray-300 mx-1"></div>

        {/* Separated Process Map */}
        <ButtonGroup label="Process Map">
           <ToolBtn onClick={onAddProcessMap} icon={FilePlus} title="Add New Process Map" />
        </ButtonGroup>

        {/* Separated Actors */}
        <ButtonGroup label="Actors">
           <ToolBtn onClick={onManageActors} icon={Users} title="Manage Actors" />
        </ButtonGroup>
        
        <div className="w-px h-10 bg-gray-300 mx-1"></div>

        {/* Nodes */}
        <ButtonGroup label="Objects">
          <ToolBtn onClick={() => onSetTool('CREATE_START')} active={currentTool === 'CREATE_START'} icon={PlayCircle} title="Start" />
          <ToolBtn onClick={() => onSetTool('CREATE_END')} active={currentTool === 'CREATE_END'} icon={StopCircle} title="End" />
          <ToolBtn onClick={() => onSetTool('CREATE_UNIT_PROCESS')} active={currentTool === 'CREATE_UNIT_PROCESS'} icon={Square} title="Unit Process" />
          <ToolBtn onClick={() => onSetTool('CREATE_GROUP_PROCESS')} active={currentTool === 'CREATE_GROUP_PROCESS'} icon={Layers} title="Group Process" />
          <ToolBtn onClick={() => onSetTool('CREATE_GROUP_DIVISION')} active={currentTool === 'CREATE_GROUP_DIVISION'} icon={LayoutTemplate} title="Group Division" />
          <ToolBtn onClick={() => onSetTool('CREATE_DECISION')} active={currentTool === 'CREATE_DECISION'} icon={GitFork} title="Decision" />
          <ToolBtn onClick={() => onSetTool('CREATE_HELP')} active={currentTool === 'CREATE_HELP'} icon={HelpCircle} title="Help" />
        </ButtonGroup>

        <div className="w-px h-10 bg-gray-300 mx-1"></div>

        {/* Single Row Group for Lines & Styles & Align */}
        <ButtonGroup label="Lines, Style & Align">
          <div className="flex flex-row items-center">
              {/* Connector Types */}
              <div className="flex border-r border-gray-300 pr-1 mr-1 space-x-0.5">
                <ToolBtn onClick={() => onSetTool('CONNECT_STRAIGHT')} active={currentTool === 'CONNECT_STRAIGHT'} icon={StraightIcon} title="Straight Line" />
                <ToolBtn onClick={() => onSetTool('CONNECT_ELBOW')} active={currentTool === 'CONNECT_ELBOW'} icon={ElbowIcon} title="Elbow Line" />
              </div>

              {/* Line Styles (Dash added) */}
              <div className="flex border-r border-gray-300 pr-1 mr-1 space-x-0.5">
                <ToolBtn onClick={() => onLineStyleChange(LineStyle.SOLID)} icon={SolidLineIcon} title="Solid" />
                <ToolBtn onClick={() => onLineStyleChange(LineStyle.DASHED)} icon={DashedLineIcon} title="Dashed" />
                <ToolBtn onClick={() => onLineStyleChange(LineStyle.DOTTED)} icon={DottedLineIcon} title="Dotted" />
              </div>

              {/* Arrow Heads */}
              <div className="flex border-r border-gray-300 pr-1 mr-1 space-x-0.5">
                  <ToolBtn onClick={() => onArrowShapeChange(ArrowShape.ARROW)} icon={ArrowEndIcon} title="Arrow" />
                  <ToolBtn onClick={() => onArrowShapeChange(ArrowShape.TRIANGLE_FILLED)} icon={TriangleFilledEndIcon} title="Filled Triangle" />
                  <ToolBtn onClick={() => onArrowShapeChange(ArrowShape.TRIANGLE_EMPTY)} icon={TriangleEmptyEndIcon} title="Empty Triangle" />
              </div>

              {/* Colors */}
              <div className="flex flex-col justify-center px-1 border-r border-gray-300 mr-1">
                <div className="flex items-center space-x-1 mb-0.5">
                  <span className="text-[9px] text-gray-500 w-6">Fill</span>
                  <input type="color" className="w-3 h-3 cursor-pointer" onChange={(e) => onColorChange('fill', e.target.value)} />
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-[9px] text-gray-500 w-6">Line</span>
                  <input type="color" className="w-3 h-3 cursor-pointer" onChange={(e) => onColorChange('stroke', e.target.value)} />
                </div>
              </div>

              {/* Alignment - Single Row */}
              <div className="flex space-x-0.5">
                  <ToolBtn onClick={() => onAlign('left')} icon={AlignStartHorizontal} title="Left" />
                  <ToolBtn onClick={() => onAlign('h-center')} icon={AlignCenterHorizontal} title="Center" />
                  <ToolBtn onClick={() => onAlign('right')} icon={AlignEndHorizontal} title="Right" />
                  <div className="w-px h-6 bg-gray-200 mx-0.5"></div>
                  <ToolBtn onClick={() => onAlign('top')} icon={AlignStartVertical} title="Top" />
                  <ToolBtn onClick={() => onAlign('v-center')} icon={AlignCenterVertical} title="Middle" />
                  <ToolBtn onClick={() => onAlign('bottom')} icon={AlignEndVertical} title="Bottom" />
              </div>
          </div>
        </ButtonGroup>
      </div>
    </div>
  );
};