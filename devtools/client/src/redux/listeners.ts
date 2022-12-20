import { Events } from "@player-tools/devtools-common";
import { Dispatch } from "redux";
import { Events as EventActions } from "./actions";

/** Utility method to filter known events from a supplied message and dispatch the corresponding action */
export const dispatchEvents = (dispatch: Dispatch) => (message: any) => {
  if (Events.isEvent(message)) dispatch(EventActions.actions[message.type](message as any))
}
