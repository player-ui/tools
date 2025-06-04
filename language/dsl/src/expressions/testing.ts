import {
  BindingParser,
  ExpressionEvaluator,
  ExpressionHandler,
  ExpressionType,
  LocalModel,
  withParser,
} from "@player-ui/player";
import { ExpressionTemplateInstance } from "../string-templates";

/**
 * Test harness to make testing expressions easier.
 * Given an expreesion and an initial data model the harness will execute the expression
 * on and return the new state of the data model.
 * @param exp expression to execute
 * @param initialData data model to operate on
 * @param expressions expression handlers for functions that are called
 * @returns Final data model state
 */
export function testExpression(
  exp: ExpressionTemplateInstance,
  initialData: object,
  expressions?: Map<string, ExpressionHandler<any[], any>>,
): object {
  // Setup Mock Player model and parsers
  const localModel = new LocalModel(initialData);
  const bindingParser = new BindingParser({
    get: localModel.get,
    set: localModel.set,
    evaluate: (exp: ExpressionType) => {
      return evaluator.evaluate(exp);
    },
  });

  const model = withParser(localModel, bindingParser.parse);
  const evaluator = new ExpressionEvaluator({ model });
  expressions?.forEach((fn, name) => evaluator.addExpressionFunction(name, fn));
  evaluator.evaluate(exp.toValue());
  return localModel.get();
}
