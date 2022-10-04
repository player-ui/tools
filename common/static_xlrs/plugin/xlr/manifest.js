import InputAsset from './InputAsset.json'
import TextAsset from './TextAsset.json'
import ActionAsset from './ActionAsset.json'
import InfoAsset from './InfoAsset.json'
import CollectionAsset from './CollectionAsset.json'
import TransformedAction from './TransformedAction.json'
import TransformedInput from './TransformedInput.json'

export default {
  "pluginName": "BaseAssetsPlugin",
  "capabilities": {
    "Assets":[InputAsset,TextAsset,ActionAsset,InfoAsset,CollectionAsset, TransformedAction, TransformedInput],
  }
}
