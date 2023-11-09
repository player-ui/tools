import React from 'react';
import type { DefaultCompilerContentType } from './types';

/** Basic way of identifying the type of file based on the default content export */
export const fingerprintContent = (
  content: unknown,
  filename?: string
): DefaultCompilerContentType | undefined => {
  if (content !== null || content !== undefined) {
    if (React.isValidElement(content as any)) {
      return 'view';
    }

    if (typeof content === 'object' && 'navigation' in (content as any)) {
      return 'flow';
    }

    if (!filename || filename.includes('schema')) {
      return 'schema';
    }
  }
};
