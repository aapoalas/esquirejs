/**
 * Original Work Copyright 2019 Valmet Automation Inc.
 */

import * as base from "./src/plugins/base";
import * as json from "./src/plugins/json";
import * as scriptBase from "./src/plugins/scriptBase";
import * as text from "./src/plugins/text";

export { define } from "./src/define";
export {
    directRequire,
    legacyRequire,
    load,
    registerErrorListener
} from "./src/load";
export { getOptions, setOptions } from "./src/options";
export { defineBasePlugin, definePlugin } from "./src/plugins";
export { provide, provideAsync, undefine } from "./src/provide";

export const plugins = {
    base,
    json,
    scriptBase,
    text
};
