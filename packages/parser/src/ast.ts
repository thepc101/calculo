export type AstNode =
  | NumberLiteral
  | StringLiteral
  | Identifier
  | BinaryOp
  | UnaryOp
  | FunctionCall
  | Assignment
  | VariableAssignment
  | MatrixLiteral
  | VectorLiteral
  | Conditional;

export interface NumberLiteral {
  type: 'number';
  value: number;
}

export interface StringLiteral {
  type: 'string';
  value: string;
}

export interface Identifier {
  type: 'identifier';
  name: string;
}

export interface BinaryOp {
  type: 'binary';
  operator: string;
  left: AstNode;
  right: AstNode;
}

export interface UnaryOp {
  type: 'unary';
  operator: string;
  operand: AstNode;
}

export interface FunctionCall {
  type: 'function';
  name: string;
  args: AstNode[];
}

export interface Assignment {
  type: 'assignment';
  variable: string;
  value: AstNode;
}

export interface VariableAssignment {
  type: 'variable';
  name: string;
  value: AstNode;
}

export interface MatrixLiteral {
  type: 'matrix';
  rows: AstNode[][];
}

export interface VectorLiteral {
  type: 'vector';
  elements: AstNode[];
}

export interface Conditional {
  type: 'conditional';
  condition: AstNode;
  consequent: AstNode;
  alternate: AstNode | null;
}
