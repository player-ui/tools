import { RUNTIME_SOURCE } from "@player-tools/devtools-common";

window.postMessage({type: 'runtime-init', source: RUNTIME_SOURCE}, '*')
