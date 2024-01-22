import type { NamedType } from '@player-tools/xlr';

export interface Types {
  pluginName: 'Types';
  capabilities: {
    Types: NamedType[];
  };
  customPrimitives: [
    'Expression',
    'Asset',
    'Binding',
    'AssetWrapper',
    'Schema.DataType',
    'ExpressionHandler'
  ];
}
