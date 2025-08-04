import type {
  Asset,
  DataModel,
  Flow,
  Navigation,
  Schema,
} from "@player-ui/types";
import type { FluentBuilder } from "./builder";
import type { ParentCtx } from "./id-generation";

/**
 * Core configuration options for creating a Player UI Flow.
 *
 * This interface defines the essential properties required to create a functional
 * Player UI flow. It includes views, navigation logic, data models, and schemas
 * that together define a complete user experience.
 *
 * @template C - The parent context type for view generation
 */
interface CoreFlowOptions<C extends ParentCtx = ParentCtx> {
  /**
   * Unique identifier for the flow.
   *
   * This identifier is used throughout the Player UI system to reference
   * and manage the flow. If not provided, defaults to "root".
   *
   * @default "root"
   *
   * @example
   * ```typescript
   * const flow = {
   *   id: "user-onboarding",
   *   // ... other options
   * };
   * ```
   */
  id?: string;

  /**
   * Array of views that can be displayed to users.
   *
   * Views can be either static Asset objects or functions that generate
   * assets based on the provided context - builders.
   *
   * Each view represents a screen or page in the user experience and will
   * typically be created using the fluent API builders.
   *
   * @example
   * ```typescript
   * const views = [
   *   // Static
   *   {
   *     asset: {
   *       id: "welcome",
   *       type: "text",
   *       value: "Welcome!"
   *     }
   *   }
   *
   *   // Builder
   *   text().withValue(`Hello, ${ctx.userId}!`),
   * ];
   * ```
   */
  views: Array<FluentBuilder>;

  /**
   * Initial data model for the flow.
   *
   * This data is available to all views and components within the flow
   * and can be referenced through data binding expressions. The data
   * model provides the runtime state that drives dynamic behavior.
   *
   * @example
   * ```typescript
   * const data = {
   *   user: {
   *     name: "John Doe",
   *     preferences: {
   *       theme: "dark",
   *       notifications: true
   *     }
   *   },
   *   currentStep: 0
   * };
   * ```
   */
  data?: DataModel;

  /**
   * Schema definition for data validation and type checking.
   *
   * The schema describes the structure and types of data used within
   * the flow. It enables validation, formatting, and type-safe data
   * binding throughout the user experience.
   *
   * @example
   * ```typescript
   * const schema = {
   *   ROOT: {
   *     user: { type: "UserType" },
   *     currentStep: { type: "NumberType" }
   *   },
   *   UserType: {
   *     name: { type: "StringType" },
   *     preferences: { type: "PreferencesType" }
   *   },
   *   PreferencesType: {
   *     theme: { type: "StringType" },
   *     notifications: { type: "BooleanType" }
   *   }
   * };
   * ```
   */
  schema?: Schema.Schema;

  /**
   * Navigation state machine that controls flow progression.
   *
   * The navigation object defines how users move through the flow,
   * including transitions between views, conditional branching,
   * and flow completion logic.
   *
   * @example
   * ```typescript
   * const navigation = {
   *   BEGIN: "FLOW",
   *   FLOW: {
   *     start: "view-1",
   *     view-1: {
   *       forward: "view-2",
   *       back: "FLOW.start"
   *     },
   *     view-2: {
   *       forward: "END_done",
   *       back: "view-1"
   *     }
   *   },
   *   END_done: { outcome: "completed" }
   * };
   * ```
   */
  navigation: Navigation;

  /**
   * Additional context to pass to view generator functions.
   *
   * This context is merged with the automatically generated parent context
   * and passed to any builder functions during flow creation. It allows for
   * custom data or configuration to be available during view generation.
   *
   * @example
   * ```typescript
   * const context = {
   *   userId: "12345",
   *   experimentGroup: "A",
   *   features: {
   *     newDesign: true,
   *     advancedMode: false
   *   }
   * };
   * ```
   */
  context?: C;
}

/**
 * Complete configuration options for creating a Player UI Flow.
 *
 * This type extends CoreFlowOptions with additional properties that can be
 * passed through to the final Flow object. It allows for custom flow
 * properties while ensuring type safety and preventing conflicts with
 * core flow functionality.
 *
 * The type excludes 'views' from the base Flow type to prevent conflicts
 * with the enhanced views processing in CoreFlowOptions.
 *
 * @template C - The parent context type for view generation
 *
 * @example
 * ```typescript
 * const flowOptions: FlowOptions = {
 *   // Core options
 *   id: "my-flow",
 *   views: [welcomeView(), mainView()],
 *   navigation: myNavigation,
 *
 *   // Additional Flow properties
 *   metadata: {
 *    version: "1.0.0",
 *    author: "John Doe"
 *   }
 * };
 * ```
 */
export type FlowOptions<C extends ParentCtx = ParentCtx> = CoreFlowOptions<C> &
  Omit<Flow<Asset>, keyof CoreFlowOptions<C> | "views">;
