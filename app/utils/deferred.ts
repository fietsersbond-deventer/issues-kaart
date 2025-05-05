/**
 * Asynchronous value resolving.
 * Deferred means Verschoven of Uitgesteld
 */
export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

export function deferred<T = unknown>(): Deferred<T> {
  // @ts-expect-error Ignore missing properties error. Object will be complete before leaving the method
  const deferred: Deferred<T> = {};

  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });

  return deferred;
}
