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

import * as json from "./src/plugins/json";
import * as scriptBase from "./src/plugins/scriptBase";
import * as text from "./src/plugins/text";
import { define } from "./src/define";
import {
  legacyRequire,
} from "./src/load";
import { defineBasePlugin, definePlugin } from "./src/plugins";

declare global {
    interface Window {
        define: typeof define;
        require: typeof legacyRequire;
    }
}

export const setup = () => {
  // Define base plugin and the json! and text! plugins
  // that it indirectly depends on.
  defineBasePlugin(scriptBase);
  definePlugin("json", json);
  definePlugin("text", text);
  
  // Define RequireJS-like globals
  window.define = define;
  // @ts-ignore TypeScript does not want anyone touching the require function
  window.require = legacyRequire;
}