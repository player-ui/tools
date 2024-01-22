import type { RefNode } from '@player-tools/xlr';

export interface CommonExpressions {
  pluginName: 'CommonExpressions';
  capabilities: {
    Expressions: RefNode[];
  };
}
