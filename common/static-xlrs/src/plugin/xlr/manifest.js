const InputAsset = require("./InputAsset.json");
const TextAsset = require("./TextAsset.json");
const ActionAsset = require("./ActionAsset.json");
const InfoAsset = require("./InfoAsset.json");
const CollectionAsset = require("./CollectionAsset.json");

module.exports = {
  pluginName: "reference-assets-web-plugin",
  capabilities: {
    Assets: [InputAsset, TextAsset, ActionAsset, InfoAsset, CollectionAsset],
  },
};
