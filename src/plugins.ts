/**
 * Original Work Copyright 2019 Valmet Automation Inc.
 */

import { ImportJSOptions } from "./options";

export interface LoadFunctionOptions {
    readonly returnDefaultExport?: boolean;
}

export type LoadFunction = (moduleName: string) => unknown | Promise<unknown>;

export interface Plugin {
    load: (
        moduleName: string,
        load: LoadFunction,
        options: Readonly<ImportJSOptions>
    ) => unknown | Promise<unknown>;
}

const plugins = new Map<string | undefined, Plugin>();

export const hasPluginByName = (pluginName: string) => plugins.has(pluginName);

export const getPluginByName = (pluginName: undefined | string) =>
    plugins.get(pluginName);

export const defineBasePlugin = (basePlugin: Plugin) => {
    if (plugins.has(undefined)) {
        // Throw an error for redefining base plugin.
        throw new Error("Base plugin has already been defined");
    }
    plugins.set(undefined, basePlugin);
}
    
export const definePlugin = (pluginName: string, plugin: Plugin) => {
    if (hasPluginByName(pluginName)) {
        // Throw an error for redefining plugins in an attempt to make sure
        // that malicious actors cannot change plugins on the fly/sly
        throw new Error(`Plugin '${plugin}' has already been defined`);
    }
    plugins.set(pluginName, plugin);
};
