/**
 * Original Work Copyright 2019 Valmet Automation Inc.
 */

/**
 * This file is a drop-in replacement for RequireJS.
 * 
 * It is not recommended for general usage as the
 * best parts of ESquireJS are not in its capability
 * to be a drop-in replacement for RequireJS but
 * the possibility to move away from callback based
 * methods in an orderly fashion. Likewise this file
 * offers no methods to customize plugin behaviour
 * or others.
 */

import * as json from "./src/plugins/json.ts";
import * as base from "./src/plugins/base.ts";
import * as text from "./src/plugins/text.ts";
import { define } from "./src/define.ts";
import {
  legacyRequire,
} from "./src/load.ts";
import { defineBasePlugin, definePlugin } from "./src/plugins.ts";

declare global {
    interface Window {
        define: typeof define;
        require: typeof legacyRequire;
    }
}

export const setup = () => {
  // Define base plugin and the json! and text! plugins
  // that it indirectly depends on.
  defineBasePlugin(base);
  definePlugin("json", json);
  definePlugin("text", text);
  
  // Define RequireJS-like globals
  window.define = define;
  // @ts-ignore TypeScript does not want anyone touching the require function
  window.require = legacyRequire;
}