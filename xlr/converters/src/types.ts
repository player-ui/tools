/**
 * Specific error that can be caught to indicate an error in conversion
 */
export class ConversionError extends Error {
  constructor(msg: string) {
    super(msg);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ConversionError.prototype);
  }

  toString() {
    return `Conversion Error: ${this.message}`;
  }
}
