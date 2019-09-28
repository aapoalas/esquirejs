/* Copyright 2019 Valmet Automation Inc.
 *
 * This document is the exclusive intellectual property of Valmet Automation Inc.
 * and/or its subsidiaries (collectively "Valmet Automation") and is furnished
 * solely for operating and maintaining the supplied equipment and/or software.
 * Use of the document for any other project or purpose is prohibited.
 * All copyrights to the document are reserved by Valmet Automation. Accordingly,
 * the document or the information contained therein shall not (whether partly or entirely)
 * be reproduced, copied or disclosed to a third party without prior written consent of Valmet Automation.
 */

import { importJSOptions } from "./options";
import {
    definePlugin,
    getPluginByName,
    hasPluginByName,
    LoadFunctionOptions,
} from "./plugins";
import {
    getModule,
    hasAnonymousModule,
    hasModule,
    provide,
    renameModule,
    hasSyncModule,
    provideAsync,
} from "./provide";

/**
 * ERROR_CALLBACKS is a set to contain error callback functions for the dynamic importer.
 * If an error occurs during a dynamic import, then these callbacks are called to report
 * the error. If no erro callbacks are registered, then the error is simply rethrown.
 */

type ErrorCallback = (error: Error) => void;

const ERROR_CALLBACKS = new Set<ErrorCallback>();

/**
 * Register an error callback listener to esquirejs. If an error happens during
 * a dynamic import, the error callback will be called with the error object.
 * If no error listeners are registered, errors will be left uncaught.
 *
 * The function returns an unsubscribe function.
 */
export const registerErrorListener = (
    errorCallback: ErrorCallback
): (() => void) => {
    ERROR_CALLBACKS.add(errorCallback);
    return () => ERROR_CALLBACKS.delete(errorCallback);
};

/**
 * Decomposes a module name to the loader plugin name and module name.
 * @param name Module name
 */
const decomposeModuleName = (name: string): [undefined | string, string] => {
    const index = name.indexOf(importJSOptions.separator);
    if (index > -1) {
        return [name.substring(0, index), name.substring(index + 1)];
    }
    return [undefined, name];
};

const containsOnlyDefaultExport = (module?: object) => {
    if (!module) {
        return false;
    }
    const exports = Object.keys(module);
    if (
        (exports.length === 1 && exports[0] === "default") ||
        (exports.length === 2 &&
            exports.includes("default") &&
            exports.includes("__esModule"))
    ) {
        return true;
    }
    return false;
};

export const recentlyDefinedModules = new Set<string>();
export const recentlyRedefinedModules = new Set<unknown>();

const clearRecentModules = () => {
    recentlyDefinedModules.clear();
    recentlyRedefinedModules.clear();
};

const resolveModule = (
    moduleName: string,
    module: any,
    options: LoadFunctionOptions = importJSOptions
): unknown | Promise<unknown> => {
    if (!module || module[Symbol.toStringTag] !== "Module") {
        // A plugin has already returned valid data,
        // provide and return
        provide(moduleName, module);
        clearRecentModules();
        return module;
    } else if (hasModule(moduleName)) {
        // The module was an AMD module
        clearRecentModules();
        return getModule(moduleName);
    }

    // ESM Mmdule, an AMD module bundle, or a mismatched / misidentified
    // AMD module
    const exports = Object.keys(module);
    if (exports.length === 0) {
        // No exports, the file is likely an AMD file or it might
        // be an ECMAScript module without exports, imported for
        // side-effects sake.
        if (recentlyRedefinedModules.size > 1) {
            // This file defined multiple AMD modules that had already been
            // defined. We have no way of figuring out which module belongs
            // where.
            clearRecentModules();
            throw new Error(
                `Module '${moduleName}' redefined multiple modules.`
            );
        } else if (recentlyDefinedModules.size > 1) {
            // This file defined multiple AMD modules. As such it was
            // likely created and intended to be a bundle file and as such
            // does not actually expose anything itself.
            clearRecentModules();
            return;
        }

        // Given that we did not find anything with the module name
        // given to us, it might well be that this is an anonymous
        // AMD module.
        if (
            recentlyDefinedModules.size === 0 &&
            recentlyRedefinedModules.size === 0 &&
            hasAnonymousModule()
        ) {
            // There indeed was an anonymous module provided recently.
            // Let us presume that is us.
            clearRecentModules();
            renameModule(moduleName);
            return getModule(moduleName);
        }

        // No anonymous module had been provided. It might be
        // that this file was actually an AMD file with a
        // mismatched module name.
        if (
            recentlyDefinedModules.size === 1 &&
            recentlyRedefinedModules.size === 0
        ) {
            // There was only one recently defined module.
            // That would probably be us. As the name had
            // a mismatch, we'll need to rename it in provided
            // modules cache.
            const providedModuleName = Array.from(recentlyDefinedModules)[0];
            console.log(
                `Module name mismatch found: '${moduleName}' loaded with defined name '${providedModuleName}'`
            );
            clearRecentModules();
            renameModule(moduleName, providedModuleName);
            return getModule(moduleName);
        } else if (
            recentlyDefinedModules.size === 0 &&
            recentlyRedefinedModules.size === 1
        ) {
            // There was one module that attempted redefining
            // an existing module. That is probably our mismatched
            // module. Although the module misidentified itself, we
            // can now identify it to the provide cache.
            const mismatchedModule = Array.from(
                recentlyRedefinedModules
            )[0] as any;
            clearRecentModules();
            if (
                typeof mismatchedModule === "function" &&
                mismatchedModule.isAsync
            ) {
                provideAsync(moduleName, mismatchedModule);
            } else {
                provide(moduleName, mismatchedModule);
            }
            return getModule(moduleName);
        }
        // No clear reason found for a 0-export, undefined module.
        // Probably this is a module imported for side-effects sake.
    }

    clearRecentModules();
    if (importJSOptions.cacheESModules === true) {
        provide(moduleName, module);
    }

    if (options !== importJSOptions) {
        options = Object.assign({}, importJSOptions, options);
    }

    return options.returnDefaultExport === true &&
        containsOnlyDefaultExport(module)
        ? module.default
        : module;
};

const loadFromPlugin = (moduleName: string): unknown | Promise<unknown> => {
    const [prefix, name] = decomposeModuleName(moduleName);
    const frozenOptions = Object.freeze(Object.assign({}, importJSOptions));
    if (typeof prefix === "string" && !hasPluginByName(prefix)) {
        if (!hasModule(prefix)) {
            throw new Error(`Unknown esquirejs plugin '${prefix}'`);
        }
        // A plugin has been provided asynchronously, load and define it
        // before starting the module load
        return Promise.resolve(getModule(prefix)).then(plugin => {
            definePlugin(prefix, plugin as any);
            return getPluginByName(prefix)!.load(
                name,
                loadFromPlugin,
                frozenOptions
            );
        });
    }

    // Found corresponding plugin
    return getPluginByName(prefix)!.load(name, loadFromPlugin, frozenOptions);
};

/**
 * Function to require component modules and functions from UI Runtime Service.
 * Non-JavaScript modules are fetched and either parsed to JSON for JSON files,
 * or to text for others. JavaScript modules are dynamically imported. If a
 * JavaScript module is a proper ECMAScript module and only exports a default
 * export then the default export is always returned directly, otherwise the
 * module is returned as it is.
 */
export const load = async (
    moduleName: string,
    options?: LoadFunctionOptions
): Promise<unknown> => {
    try {
        if (hasModule(moduleName)) {
            return getModule(moduleName);
        }

        const resource = await loadFromPlugin(moduleName);
        return resolveModule(moduleName, resource, options);
    } catch (err) {
        if (ERROR_CALLBACKS.size === 0) {
            throw err;
        } else {
            ERROR_CALLBACKS.forEach(cb => cb(err));
        }
    }
};

// const normalizeIfNeeded = (name: string, parentName: string) => {
//     const baseName: string = name.split(importJSOptions.separator).pop()!;
//     if (!baseName.startsWith("./") && !baseName.startsWith("../")) {
//         return name;
//     }

//     const [prefix, nameToNormalize] = decomposeModuleName(name);
//     if (typeof prefix === "string" && !hasPluginByName(prefix)) {
//         throw new Error(`Unknown esquirejs plugin ${prefix}`);
//     }

//     // Found corresponding plugin
//     const plugin = getPluginByName(prefix)!;
//     if (typeof plugin.normalize === "function") {
//         return plugin.normalize(nameToNormalize, (deepName: string) =>
//             normalizeIfNeeded(deepName, parentName)
//         );
//     }
// };

export const directRequire = (
    name: string,
    options: LoadFunctionOptions = importJSOptions
): unknown => {
    if (hasSyncModule(name)) {
        const module = getModule(name) as any;
        if (options !== importJSOptions) {
            options = Object.assign({}, importJSOptions, options);
        }
        if (
            options.returnDefaultExport === true &&
            module[Symbol.toStringTag] === "Module"
        ) {
            return containsOnlyDefaultExport(module) ? module.default : module;
        }
        return module;
    }
    throw new Error(`No library by name of '${name}' found.`);
};
