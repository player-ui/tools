const DataTypes_BooleanType = require("./DataTypes.BooleanType.json")
const DataTypes_IntegerType = require("./DataTypes.IntegerType.json")
const DataTypes_IntegerPosType = require("./DataTypes.IntegerPosType.json")
const DataTypes_IntegerNNType = require("./DataTypes.IntegerNNType.json")
const DataTypes_StringType = require("./DataTypes.StringType.json")
const DataTypes_CollectionType = require("./DataTypes.CollectionType.json")
const DataTypes_DateType = require("./DataTypes.DateType.json")
const DataTypes_PhoneType = require("./DataTypes.PhoneType.json")
const Formatters_commaNumber = require("./Formatters.commaNumber.json")
const Formatters_currency = require("./Formatters.currency.json")
const Formatters_date = require("./Formatters.date.json")
const Formatters_integer = require("./Formatters.integer.json")
const Formatters_phone = require("./Formatters.phone.json")
const Validators_collection = require("./Validators.collection.json")
const Validators_email = require("./Validators.email.json")
const Validators_expression = require("./Validators.expression.json")
const Validators_integer = require("./Validators.integer.json")
const Validators_length = require("./Validators.length.json")
const Validators_max = require("./Validators.max.json")
const Validators_min = require("./Validators.min.json")
const Validators_oneOf = require("./Validators.oneOf.json")
const Validators_phone = require("./Validators.phone.json")
const Validators_readonly = require("./Validators.readonly.json")
const Validators_regex = require("./Validators.regex.json")
const Validators_required = require("./Validators.required.json")
const Validators_string = require("./Validators.string.json")
const Validators_zip = require("./Validators.zip.json")

    module.exports = {
      "pluginName": "CommonTypes",
      "capabilities": {
        "Assets":[],
		"Views":[],
		"Expressions":[],
		"DataTypes":[DataTypes_BooleanType,DataTypes_IntegerType,DataTypes_IntegerPosType,DataTypes_IntegerNNType,DataTypes_StringType,DataTypes_CollectionType,DataTypes_DateType,DataTypes_PhoneType],
		"Formatters":[Formatters_commaNumber,Formatters_currency,Formatters_date,Formatters_integer,Formatters_phone],
		"Validators":[Validators_collection,Validators_email,Validators_expression,Validators_integer,Validators_length,Validators_max,Validators_min,Validators_oneOf,Validators_phone,Validators_readonly,Validators_regex,Validators_required,Validators_string,Validators_zip],
      },
      "customPrimitives": [
        "Expression","Asset","Binding","AssetWrapper","Schema.DataType","ExpressionHandler","FormatType","ValidatorFunction"
      ]
    }
