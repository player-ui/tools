interface Logger {
  /** Log a message */
  log: (...args: any[]) => void;
}

/** Create a logger that tracks the script source */
export function createLogger(source: string): Logger {
  return {
    log: (...args: any[]) => {
      console.log(source, ...args);
    },
  };
}
