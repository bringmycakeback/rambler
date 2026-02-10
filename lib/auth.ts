import { redis, isRedisConfigured } from "./redis";

const SESSION_PREFIX = "session:";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

export async function createSession(): Promise<string | null> {
  if (!isRedisConfigured()) return null;

  const id = crypto.randomUUID();
  try {
    await redis.set(`${SESSION_PREFIX}${id}`, "1", { ex: SESSION_TTL });
    return id;
  } catch (error) {
    console.error("Failed to create session:", error);
    return null;
  }
}

export async function validateSession(id: string): Promise<boolean> {
  if (!isRedisConfigured() || !id) return false;

  try {
    const exists = await redis.exists(`${SESSION_PREFIX}${id}`);
    return exists === 1;
  } catch (error) {
    console.error("Failed to validate session:", error);
    return false;
  }
}

export async function deleteSession(id: string): Promise<void> {
  if (!isRedisConfigured() || !id) return;

  try {
    await redis.del(`${SESSION_PREFIX}${id}`);
  } catch (error) {
    console.error("Failed to delete session:", error);
  }
}
