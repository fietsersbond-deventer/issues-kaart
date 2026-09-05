import { useRuntimeConfig } from "#imports";
const detectDatabaseType = async (db) => {
  try {
    const pgResult = await db.sql`SELECT pg_try_advisory_lock(999999999) as locked`;
    if (pgResult.rows && pgResult.rows.length > 0) {
      if (pgResult.rows[0]?.locked === true) {
        await db.sql`SELECT pg_advisory_unlock(999999999)`;
      }
      return "postgresql";
    }
  } catch {
  }
  try {
    const result = await db.sql`SELECT GET_LOCK('nuxt-db-migrations-detect', 0) as locked`;
    const locked = result.rows?.[0]?.locked;
    if (locked === 1) {
      await db.sql`SELECT RELEASE_LOCK('nuxt-db-migrations-detect')`;
      return "mysql";
    }
    if (typeof locked === "number") {
      return "mysql";
    }
  } catch {
  }
  return "sqlite";
};
const hashLockName = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};
export const acquireLock = async (db, lockName = "nuxt-db-migrations") => {
  const dbType = await detectDatabaseType(db);
  try {
    if (dbType === "postgresql") {
      const lockKey = hashLockName(lockName);
      const result = await db.sql`SELECT pg_try_advisory_lock(${lockKey}) as locked`;
      return result.rows[0]?.locked === true;
    } else if (dbType === "mysql") {
      const result = await db.sql`SELECT GET_LOCK(${lockName}, 0) as locked`;
      const locked = result.rows[0]?.locked;
      return locked === 1;
    } else {
      return true;
    }
  } catch {
    return false;
  }
};
export const releaseLock = async (db, lockName = "nuxt-db-migrations") => {
  const dbType = await detectDatabaseType(db);
  try {
    if (dbType === "postgresql") {
      const lockKey = hashLockName(lockName);
      await db.sql`SELECT pg_advisory_unlock(${lockKey})`;
    } else if (dbType === "mysql") {
      await db.sql`SELECT RELEASE_LOCK(${lockName})`;
    }
  } catch {
  }
};
export const waitForLock = async (db, lockName = "nuxt-db-migrations", timeoutMs) => {
  const config = useRuntimeConfig();
  const timeout = timeoutMs || config.dbMigrations.lockTimeout || 3e4;
  const dbType = await detectDatabaseType(db);
  const startTime = Date.now();
  const checkInterval = 500;
  if (dbType === "mysql") {
    try {
      const timeoutSeconds = Math.max(1, Math.ceil(timeout / 1e3));
      const result = await db.sql`SELECT GET_LOCK(${lockName}, ${timeoutSeconds}) as locked`;
      return result.rows[0]?.locked === 1;
    } catch {
      return false;
    }
  }
  while (Date.now() - startTime < timeout) {
    const acquired = await acquireLock(db, lockName);
    if (acquired) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }
  return false;
};
export const withLock = async (db, fn, lockName = "nuxt-db-migrations") => {
  const config = useRuntimeConfig();
  const timeout = config.dbMigrations.lockTimeout || 3e4;
  const acquired = await waitForLock(db, lockName, timeout);
  if (!acquired) {
    throw new Error(`Failed to acquire migration lock '${lockName}' within ${timeout}ms`);
  }
  try {
    const result = await fn();
    return result;
  } finally {
    await releaseLock(db, lockName);
  }
};
