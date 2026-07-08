import { z } from 'zod';

export const angleModeSchema = z.enum(['deg', 'rad', 'grad']);
export const calculatorTypeSchema = z.enum(['basic', 'scientific', 'custom']);
export const themeModeSchema = z.enum(['light', 'dark', 'oled', 'high-contrast', 'glass', 'neumorphism', 'minimal', 'corporate', 'custom']);

export const evaluationRequestSchema = z.object({
  expression: z.string().min(1, 'Expression is required'),
  variables: z.record(z.number()).optional(),
  precision: z.number().int().min(0).max(100).optional(),
  angleMode: angleModeSchema.optional(),
});

export const graphRequestSchema = z.object({
  expressions: z.array(z.object({
    expression: z.string(),
    color: z.string().optional(),
    label: z.string().optional(),
    visible: z.boolean().optional(),
    type: z.enum(['cartesian', 'parametric', 'polar', 'implicit', 'vector', 'contour']).optional(),
    lineWidth: z.number().optional(),
    opacity: z.number().optional(),
  })).min(1),
  bounds: z.object({
    xMin: z.number(),
    xMax: z.number(),
    yMin: z.number(),
    yMax: z.number(),
  }).optional(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(64),
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, 'Must be lowercase alphanumeric with dashes'),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(64),
  projectId: z.string(),
  expiresAt: z.string().optional(),
});

export const calculatorConfigSchema: z.ZodType<unknown> = z.object({
  id: z.string().optional(),
  type: calculatorTypeSchema,
  theme: z.object({
    mode: themeModeSchema,
    primaryColor: z.string(),
    backgroundColor: z.string(),
    textColor: z.string(),
    fontFamily: z.string(),
    borderRadius: z.number(),
    spacing: z.number(),
    customCss: z.string().optional(),
  }),
  width: z.union([z.string(), z.number()]),
  height: z.union([z.string(), z.number()]),
  precision: z.number().int().min(0).max(100),
  angleMode: angleModeSchema,
  graph: z.boolean(),
  history: z.boolean(),
  memory: z.boolean(),
  buttons: z.array(z.any()),
  layout: z.object({
    rows: z.number(),
    columns: z.number(),
    gap: z.number(),
    padding: z.number(),
    buttonOrder: z.array(z.string()),
    sidePanel: z.boolean(),
    graphPanel: z.boolean(),
  }),
  variables: z.array(z.object({
    name: z.string(),
    value: z.number(),
    description: z.string().optional(),
    visible: z.boolean(),
  })),
  functions: z.array(z.object({
    name: z.string(),
    expression: z.string(),
    parameters: z.array(z.string()),
    description: z.string().optional(),
  })),
  display: z.object({
    showExpression: z.boolean(),
    showResult: z.boolean(),
    showHistory: z.boolean(),
    fontSize: z.number(),
    multiline: z.boolean(),
    maxLines: z.number(),
  }),
  accessibility: z.object({
    ariaLabels: z.boolean(),
    keyboardShortcuts: z.boolean(),
    highContrast: z.boolean(),
    screenReader: z.boolean(),
  }),
  localization: z.object({
    locale: z.string(),
    decimalSeparator: z.enum(['.', ',']),
    thousandsSeparator: z.enum([',', '.', ' ', '']),
    currencySymbol: z.string(),
  }),
});

export const embedConfigSchema = z.object({
  calculatorId: z.string(),
  theme: z.object({
    mode: themeModeSchema.optional(),
    primaryColor: z.string().optional(),
    backgroundColor: z.string().optional(),
  }).optional(),
  width: z.union([z.string(), z.number()]).optional(),
  height: z.union([z.string(), z.number()]).optional(),
});
