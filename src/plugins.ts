/**
 * Original Work Copyright 2019 Valmet Automation Inc.
 */

import { ImportJSOptions } from "./options";
import * as basePlugin from "./plugins/scriptBase";
import * as json from "./plugins/json";
import * as text from "./plugins/text";

export interface LoadFunctionOptions {
    readonly baseUrl?: string;
    readonly returnDefaultExport?: boolean;
}

export type LoadFunction = (moduleName: string) => unknown | Promise<unknown>;

export interface Plugin {
    load: (
        moduleName: string,
        load: LoadFunction,
        options: Readonly<ImportJSOptions>
    ) => unknown | Promise<unknown>;
    normalize?: (
        moduleName: string,
        normalize: (moduleName: string) => string
    ) => string;
}

const plugins = new Map<string | undefined, Plugin>([
    [undefined, basePlugin],
    ["json", json],
    ["text", text],
]);

export const hasPluginByName = (pluginName: string) => plugins.has(pluginName);

export const getPluginByName = (pluginName: undefined | string) =>
    plugins.get(pluginName);

export const definePlugin = (pluginName: string, plugin: Plugin) => {
    if (hasPluginByName(pluginName)) {
        // Throw an error for redefining plugins in an attempt to make sure
        // that malicious actors cannot change plugins on the fly/sly
        throw new Error(`Plugin '${plugin}' has already been defined`);
    }
    plugins.set(pluginName, plugin);
};
