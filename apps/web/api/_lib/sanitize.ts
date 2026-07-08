const DANGEROUS_PATTERNS = [
  /<script[\s>]/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:text\/html/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
];

export function sanitizeInput(input: string): string {
  let clean = input;
  for (const pattern of DANGEROUS_PATTERNS) {
    clean = clean.replace(pattern, '');
  }
  return clean;
}

export function sanitizeExpression(expr: string): string {
  return expr.replace(/[^0-9a-zA-Z+\-*/^().,%!\sπe√∫∑∏]/g, '');
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(slug);
}
