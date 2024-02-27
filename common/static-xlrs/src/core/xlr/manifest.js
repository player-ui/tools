const Asset = require("./Asset.json");
const AssetBinding = require("./AssetBinding.json");
const SwitchCase = require("./SwitchCase.json");
const Switch = require("./Switch.json");
const AssetWrapper = require("./AssetWrapper.json");
const AssetWrapperOrSwitch = require("./AssetWrapperOrSwitch.json");
const AssetSwitch = require("./AssetSwitch.json");
const StaticSwitch = require("./StaticSwitch.json");
const DynamicSwitch = require("./DynamicSwitch.json");
const Expression = require("./Expression.json");
const ExpressionRef = require("./ExpressionRef.json");
const Binding = require("./Binding.json");
const BindingRef = require("./BindingRef.json");
const DataModel = require("./DataModel.json");
const Navigation = require("./Navigation.json");
const ExpressionObject = require("./ExpressionObject.json");
const NavigationFlow = require("./NavigationFlow.json");
const NavigationFlowTransition = require("./NavigationFlowTransition.json");
const NavigationBaseState = require("./NavigationBaseState.json");
const NavigationFlowTransitionableState = require("./NavigationFlowTransitionableState.json");
const NavigationFlowViewState = require("./NavigationFlowViewState.json");
const NavigationFlowEndState = require("./NavigationFlowEndState.json");
const NavigationFlowActionState = require("./NavigationFlowActionState.json");
const NavigationFlowExternalState = require("./NavigationFlowExternalState.json");
const NavigationFlowFlowState = require("./NavigationFlowFlowState.json");
const NavigationFlowState = require("./NavigationFlowState.json");
const FlowResult = require("./FlowResult.json");
const Templatable = require("./Templatable.json");
const Template = require("./Template.json");
const View = require("./View.json");
const Flow = require("./Flow.json");

module.exports = {
  pluginName: "Types",
  capabilities: {
    Types: [
      Asset,
      AssetBinding,
      SwitchCase,
      Switch,
      AssetWrapper,
      AssetWrapperOrSwitch,
      AssetSwitch,
      StaticSwitch,
      DynamicSwitch,
      Expression,
      ExpressionRef,
      Binding,
      BindingRef,
      DataModel,
      Navigation,
      ExpressionObject,
      NavigationFlow,
      NavigationFlowTransition,
      NavigationBaseState,
      NavigationFlowTransitionableState,
      NavigationFlowViewState,
      NavigationFlowEndState,
      NavigationFlowActionState,
      NavigationFlowExternalState,
      NavigationFlowFlowState,
      NavigationFlowState,
      FlowResult,
      Templatable,
      Template,
      View,
      Flow,
    ],
  },
  customPrimitives: [
    "Expression",
    "Asset",
    "Binding",
    "AssetWrapper",
    "Schema.DataType",
    "ExpressionHandler",
  ],
};
