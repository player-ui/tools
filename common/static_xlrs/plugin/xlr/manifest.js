const InputAsset = require( './InputAsset.json')
const TextAsset = require( './TextAsset.json')
const ActionAsset = require( './ActionAsset.json')
const InfoAsset = require( './InfoAsset.json')
const CollectionAsset = require( './CollectionAsset.json')
const TransformedAction = require( './TransformedAction.json')
const TransformedInput = require( './TransformedInput.json')

module.exports = {
  "pluginName": "BaseAssetsPlugin",
  "capabilities": {
    "Assets":[InputAsset,TextAsset,ActionAsset,InfoAsset,CollectionAsset, TransformedAction, TransformedInput],
  }
}
