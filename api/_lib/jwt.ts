import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const SECRET = process.env.JWT_SECRET;
const ALG = 'HS256';

function getSecret() {
  if (!SECRET) throw new Error('JWT_SECRET not set');
  return new TextEncoder().encode(SECRET);
}

export interface TokenPayload extends JWTPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh';
}

export async function signToken(payload: { sub: string; email: string; type: 'access' | 'refresh' }): Promise<string> {
  const expiresIn = payload.type === 'access' ? '30d' : '90d';
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setIssuer('calculo')
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { issuer: 'calculo' });
    return payload as TokenPayload;
  } catch {
    return null;
  }
}
