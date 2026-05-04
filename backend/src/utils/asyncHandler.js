/**
 * Garante que erros async cheguem ao middleware global do Express.
 * @param {(req: import('express').Request, res: import('express').Response) => Promise<void>} fn
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}
