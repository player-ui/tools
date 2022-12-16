import { RUNTIME_SOURCE } from "@player-tools/devtools-common";

window.postMessage({type: 'runtime-init', source: RUNTIME_SOURCE}, '*')

console.warn("If something isn't working, maybe the runtime isn't set up? 2");
