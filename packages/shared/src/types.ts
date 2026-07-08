export type AngleMode = 'deg' | 'rad' | 'grad';
export type CalculatorType = 'basic' | 'scientific' | 'graphing' | 'financial' | 'programming' | 'custom';
export type ThemeMode = 'light' | 'dark' | 'oled' | 'high-contrast' | 'glass' | 'neumorphism' | 'minimal' | 'corporate' | 'custom';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';
export type ButtonShape = 'square' | 'rounded' | 'pill' | 'circle';

export interface CalculatorConfig {
  id?: string;
  type: CalculatorType;
  theme: ThemeConfig;
  width: string | number;
  height: string | number;
  precision: number;
  angleMode: AngleMode;
  graph: boolean;
  history: boolean;
  memory: boolean;
  buttons: ButtonConfig[];
  layout: LayoutConfig;
  variables: VariableDef[];
  functions: FunctionDef[];
  display: DisplayConfig;
  accessibility: AccessibilityConfig;
  localization: LocalizationConfig;
}

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  borderRadius: number;
  spacing: number;
  customCss?: string;
}

export interface ButtonConfig {
  id: string;
  label: string;
  value: string;
  type: 'number' | 'operator' | 'function' | 'memory' | 'action' | 'custom';
  size?: ButtonSize;
  shape?: ButtonShape;
  color?: string;
  icon?: string;
  position: { row: number; col: number; width?: number; height?: number };
  action?: string;
}

export interface LayoutConfig {
  rows: number;
  columns: number;
  gap: number;
  padding: number;
  buttonOrder: string[];
  sidePanel: boolean;
  graphPanel: boolean;
}

export interface DisplayConfig {
  showExpression: boolean;
  showResult: boolean;
  showHistory: boolean;
  fontSize: number;
  multiline: boolean;
  maxLines: number;
}

export interface AccessibilityConfig {
  ariaLabels: boolean;
  keyboardShortcuts: boolean;
  highContrast: boolean;
  screenReader: boolean;
}

export interface LocalizationConfig {
  locale: string;
  decimalSeparator: '.' | ',';
  thousandsSeparator: ',' | '.' | ' ' | '';
  currencySymbol: string;
}

export interface VariableDef {
  name: string;
  value: number;
  description?: string;
  visible: boolean;
}

export interface FunctionDef {
  name: string;
  expression: string;
  parameters: string[];
  description?: string;
}

export interface EvaluationRequest {
  expression: string;
  variables?: Record<string, number>;
  precision?: number;
  angleMode?: AngleMode;
}

export interface EvaluationResult {
  result: number | Complex | Matrix | Vector;
  error?: string;
  steps?: EvaluationStep[];
}

export interface EvaluationStep {
  expression: string;
  result: string;
}

export interface GraphRequest {
  expressions: GraphExpression[];
  bounds?: GraphBounds;
  theme?: Partial<ThemeConfig>;
}

export interface GraphExpression {
  expression: string;
  color?: string;
  label?: string;
  visible?: boolean;
  type?: 'cartesian' | 'parametric' | 'polar' | 'implicit' | 'vector' | 'contour';
  lineWidth?: number;
  opacity?: number;
}

export interface GraphBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin?: number;
  zMax?: number;
}

export interface GraphData {
  points: Point2D[] | Point3D[];
  annotations?: Annotation[];
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Annotation {
  type: 'point' | 'line' | 'text' | 'area';
  label: string;
  position: Point2D;
}

export interface Complex {
  re: number;
  im: number;
}

export interface Matrix {
  rows: number;
  cols: number;
  data: number[][];
}

export type Vector = number[];

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  projectId: string;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageEvent {
  id: string;
  projectId: string;
  calculatorId?: string;
  type: 'evaluate' | 'render' | 'embed' | 'api';
  count: number;
  timestamp: string;
}

export interface AnalyticsData {
  totalEvaluations: number;
  totalCalculators: number;
  totalUsers: number;
  averageResponseTime: number;
  topCalculators: Array<{ id: string; name: string; count: number }>;
  usageByDay: Array<{ date: string; count: number }>;
  errors: Array<{ code: string; count: number }>;
}

export interface CalculatorTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  config: CalculatorConfig;
  author: string;
  downloads: number;
  rating: number;
  published: boolean;
}

export interface EmbedConfig {
  calculatorId: string;
  theme?: Partial<ThemeConfig>;
  width?: string | number;
  height?: string | number;
  buttons?: string[];
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, unknown>;
  timestamp: string;
}
