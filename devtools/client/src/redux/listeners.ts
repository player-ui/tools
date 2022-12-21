import { Events } from "@player-tools/devtools-common";
import { Dispatch } from "redux";
import { EventActions } from "./actions";

/** Utility method to filter known events from a supplied message and dispatch the corresponding action */
export const dispatchEvents = (dispatch: Dispatch) => (message: any) => {
  if (Events.isEvent(message)) dispatch(EventActions[message.type](message as any))
}
