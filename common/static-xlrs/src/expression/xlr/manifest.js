const size = require("./size.json");
const length = require("./length.json");
const isEmpty = require("./isEmpty.json");
const isNotEmpty = require("./isNotEmpty.json");
const concat = require("./concat.json");
const trim = require("./trim.json");
const upperCase = require("./upperCase.json");
const lowerCase = require("./lowerCase.json");
const replace = require("./replace.json");
const titleCase = require("./titleCase.json");
const sentenceCase = require("./sentenceCase.json");
const number = require("./number.json");
const round = require("./round.json");
const floor = require("./floor.json");
const ceil = require("./ceil.json");
const sum = require("./sum.json");
const findPropertyIndex = require("./findPropertyIndex.json");
const findProperty = require("./findProperty.json");
const containsAny = require("./containsAny.json");

module.exports = {
  pluginName: "CommonExpressions",
  capabilities: {
    Assets: [],
    Views: [],
    Expressions: [
      size,
      length,
      isEmpty,
      isNotEmpty,
      concat,
      trim,
      upperCase,
      lowerCase,
      replace,
      titleCase,
      sentenceCase,
      number,
      round,
      floor,
      ceil,
      sum,
      findPropertyIndex,
      findProperty,
      containsAny,
    ],
  },
};
