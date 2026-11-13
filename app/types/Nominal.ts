/**
 * Nominal typing sometimes called opaque types or type branding
 *
 * @see: https://evertpot.com/opaque-ts-types/
 * @see: https://betterprogramming.pub/nominal-typescript-eee36e9432d2
 */
declare const __brand: unique symbol;
export type Nominal<T, K> = T & { [__brand]: K };
