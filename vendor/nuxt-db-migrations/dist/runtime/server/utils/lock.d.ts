/**
 * Acquire native advisory lock (non-blocking attempt)
 * @returns true if lock acquired, false if already locked
 */
export declare const acquireLock: (db: any, lockName?: string) => Promise<boolean>;
/**
 * Release native advisory lock
 */
export declare const releaseLock: (db: any, lockName?: string) => Promise<void>;
/**
 * Wait for lock with timeout and retries
 * @returns true if lock acquired, false if timeout
 */
export declare const waitForLock: (db: any, lockName?: string, timeoutMs?: number) => Promise<boolean>;
/**
 * Execute function with migration lock using native advisory locks
 */
export declare const withLock: <T>(db: any, fn: () => Promise<T>, lockName?: string) => Promise<T>;
