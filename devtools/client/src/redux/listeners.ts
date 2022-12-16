import { Events, Message } from "@player-tools/devtools-common";
import { Events as EventActions } from "./actions";

export function handleMessage(message: Message) {
  // propagate message to default event handlers
  const { type } = message;
  if (type in Events.EventTypes) {
    EventActions.actions[type as Events.EventTypes](message as any)
  }
}
