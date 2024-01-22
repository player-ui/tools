import type { NamedType } from '@player-tools/xlr';

export interface ReferenceAssetsWebPluginManifest {
  pluginName: 'reference-assets-web-plugin';
  capabilities: {
    Assets: NamedType[];
  };
}
