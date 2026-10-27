/**
 * A PDF export failure with a Vietnamese message meant for the user. Anything else thrown
 * during an export (jsPDF, svg2pdf, the browser) is shown as a generic message instead.
 */
export class ExportError extends Error {
  override name = 'ExportError'
}
