/**
 * Original Work Copyright 2019 Valmet Automation Inc.
 */

import * as base from "./src/plugins/base.ts";
import * as json from "./src/plugins/json.ts";
import * as text from "./src/plugins/text.ts";

export { define } from "./src/define";
export {
    directRequire,
    legacyRequire,
    load,
    registerErrorListener
} from "./src/load";
export { getOptions, setOptions } from "./src/options.ts";
export { defineBasePlugin, definePlugin } from "./src/plugins.ts";
export { provide, provideAsync, undefine } from "./src/provide.ts";

export const plugins = {
    base,
    json,
    text
};
