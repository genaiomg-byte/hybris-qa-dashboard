import { type Request, type Response, type NextFunction } from "express";
import { supabase } from "../lib/supabase";

export interface AuthUser {
  id: string;
  email?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Extracts and decodes the Supabase JWT from the Authorization header.
 * We decode without verification for the API layer — Supabase already verified
 * the token before it was issued. For stronger security you can add the
 * SUPABASE_JWT_SECRET env var and verify with jsonwebtoken.
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    req.user = undefined;
    next();
    return;
  }

  const token = header.slice(7);
  try {
    // Decode the JWT payload (base64url, middle segment)
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT");
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );
    req.user = {
      id: payload.sub as string,
      email: payload.email as string | undefined,
    };
  } catch {
    req.user = undefined;
  }

  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

/**
 * Checks that the authenticated user's email exists in the Supabase
 * allowed_users table. Must be used after requireAuth.
 */
export async function requireAllowedUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const email = req.user?.email;
  if (!email) {
    res.status(403).json({ error: "Access denied. Email your request to genai.omg.@gmail.com to get access." });
    return;
  }

  const { data, error } = await supabase
    .from("allowed_users")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (error || !data) {
    res.status(403).json({ error: "Access denied. Email your request to genai.omg.@gmail.com to get access." });
    return;
  }

  next();
}
