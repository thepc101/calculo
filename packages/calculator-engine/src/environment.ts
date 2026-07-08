import type { AngleMode } from '@calculo/shared';
import { CONSTANTS } from '@calculo/shared';

export class Environment {
  variables: Map<string, number> = new Map();
  functions: Map<string, { params: string[]; body: string }> = new Map();
  angleMode: AngleMode = 'rad';
  precision = 12;
  memory: number[] = [];

  constructor() {
    this.initConstants();
  }

  private initConstants() {
    this.variables.set('PI', CONSTANTS.PI);
    this.variables.set('pi', CONSTANTS.PI);
    this.variables.set('E', CONSTANTS.E);
    this.variables.set('e', CONSTANTS.E);
    this.variables.set('TAU', CONSTANTS.TAU);
    this.variables.set('tau', CONSTANTS.TAU);
    this.variables.set('PHI', CONSTANTS.PHI);
    this.variables.set('phi', CONSTANTS.PHI);
    this.variables.set('INFINITY', Infinity);
    this.variables.set('infinity', Infinity);
    this.variables.set('NaN', NaN);
  }

  setVariable(name: string, value: number) {
    this.variables.set(name, value);
  }

  getVariable(name: string): number | undefined {
    if (name === 'ans' && this.memory.length > 0) {
      return this.memory[this.memory.length - 1];
    }
    return this.variables.get(name);
  }

  setFunction(name: string, params: string[], body: string) {
    this.functions.set(name, { params, body });
  }

  getFunction(name: string) {
    return this.functions.get(name);
  }

  pushMemory(value: number) {
    this.memory.push(value);
  }

  clearMemory() {
    this.memory = [];
  }

  clone(): Environment {
    const env = new Environment();
    env.variables = new Map(this.variables);
    env.functions = new Map(this.functions);
    env.angleMode = this.angleMode;
    env.precision = this.precision;
    env.memory = [...this.memory];
    return env;
  }
}
