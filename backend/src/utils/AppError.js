export class AppError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {Record<string, unknown> | null} [details]
   */
  constructor(statusCode, message, details = null) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.details = details
  }
}
