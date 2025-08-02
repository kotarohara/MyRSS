import { db, User } from "../db.ts";

export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

export class AuthService {
  private readonly sessionDuration = 7 * 24 * 60 * 60 * 1000; // 7 days

  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await this.hashPassword(password);
    return passwordHash === hash;
  }

  async register(
    username: string,
    email: string,
    password: string,
  ): Promise<User> {
    const existingUserByEmail = await db.getUserByEmail(email);
    if (existingUserByEmail) {
      throw new Error("User with this email already exists");
    }

    const existingUserByUsername = await db.getUserByUsername(username);
    if (existingUserByUsername) {
      throw new Error("User with this username already exists");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    if (!this.isValidEmail(email)) {
      throw new Error("Invalid email address");
    }

    if (!this.isValidUsername(username)) {
      throw new Error(
        "Username must be 3-20 characters long and contain only letters, numbers, and underscores",
      );
    }

    const passwordHash = await this.hashPassword(password);

    return await db.createUser({
      username,
      email,
      passwordHash,
    });
  }

  async login(
    usernameOrEmail: string,
    password: string,
  ): Promise<{ user: User; session: Session }> {
    let user: User | null = null;

    if (this.isValidEmail(usernameOrEmail)) {
      user = await db.getUserByEmail(usernameOrEmail);
    } else {
      user = await db.getUserByUsername(usernameOrEmail);
    }

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isPasswordValid = await this.verifyPassword(
      password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    const session = await this.createSession(user.id);

    return { user, session };
  }

  async createSession(userId: string): Promise<Session> {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionDuration);

    const session: Session = {
      id: sessionId,
      userId,
      createdAt: now,
      expiresAt,
    };

    await db.kv.set(["session", sessionId], session);
    await db.kv.set(["user_sessions", userId, sessionId], session);

    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const result = await db.kv.get<Session>(["session", sessionId]);
    const session = result.value;

    if (!session) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      await this.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const session = await db.kv.get<Session>(["session", sessionId]);

    if (session.value) {
      await db.kv.delete(["session", sessionId]);
      await db.kv.delete(["user_sessions", session.value.userId, sessionId]);
    }
  }

  async getUserFromSession(sessionId: string): Promise<User | null> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return null;
    }

    return await db.getUserById(session.userId);
  }

  async logout(sessionId: string): Promise<void> {
    await this.deleteSession(sessionId);
  }

  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    const sessions: { key: Deno.KvKey; session: Session }[] = [];

    const iter = db.kv.list<Session>({ prefix: ["session"] });

    for await (const { key, value } of iter) {
      if (value && value.expiresAt < now) {
        sessions.push({ key, session: value });
      }
    }

    for (const { key, session } of sessions) {
      await db.kv.delete(key);
      await db.kv.delete(["user_sessions", session.userId, session.id]);
    }

    console.log(`Cleaned up ${sessions.length} expired sessions`);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  }
}

export const authService = new AuthService();

export function getSessionCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;

  const sessionMatch = cookie.match(/session=([^;]+)/);
  return sessionMatch ? sessionMatch[1] : null;
}

export function setSessionCookie(sessionId: string): string {
  return `session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${
    7 * 24 * 60 * 60
  }; Path=/`;
}

export function clearSessionCookie(): string {
  return "session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/";
}
