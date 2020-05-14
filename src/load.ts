/**
 * Original Work Copyright 2019 Valmet Automation Inc.
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
} from "./provide.ts";

/**
 * ERROR_CALLBACKS is a set to contain error callback functions for the dynamic importer.
 * If an error occurs during a dynamic import, then these callbacks are called to report
 * the error. If no erro callbacks are registered, then the error is simply rethrown.
 */

type ErrorCallback = (error: Error) => void;

const ERROR_CALLBACKS = new Set<ErrorCallback>();

/**
 * Register an error callback listener to EsquireJS. If an error happens during
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
            throw new Error(`Unknown EsquireJS plugin '${prefix}'`);
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

const loadsInProgress = new Map<string, Promise<unknown>>();

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
        } else if (loadsInProgress.has(moduleName)) {
            return loadsInProgress.get(moduleName);
        }

        const loadResult = loadFromPlugin(moduleName);
        if (loadResult instanceof Promise) {
            const inProgressPromise = loadResult
                .then(resource => resolveModule(moduleName, resource, options))
                .finally(() => loadsInProgress.delete(moduleName));
            loadsInProgress.set(moduleName, inProgressPromise);
            return inProgressPromise;
        }
        return resolveModule(moduleName, loadResult, options);
    } catch (err) {
        if (ERROR_CALLBACKS.size === 0) {
            throw err;
        } else {
            ERROR_CALLBACKS.forEach(cb => cb(err));
        }
    }
};

/**
 * Function to require synchronously provided or previously loaded
 * modules from ESquireJS's cache. If a module is not found, the
 * function throws an error.
 * 
 * The function's behaviour is similar to RequireJS's `require("module")`
 * API without the possibility to use an array of module names to
 * asynchronously require modules.
 * 
 * @param name Name of module to require from cache
 * @param options Optional options for the require
 */
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

/**
 * Function to require modules in cache synchronously or load more
 * asynchronously using a callback or from a returned Promise.
 * 
 * The function's behaviour is similar to RequireJS's `require(...args)`
 * in that it can be used to synchronously require modules or to
 * asynchronously fetch more modules with the module names given in
 * an array. The only difference is that in RequireJS the form
 * `require(["module1", "module2"])` would return a new require
 * function with the two given modules bound into its callback.
 * In ESquireJS this form returns a Promise for an array containing
 * the two requested modules.
 * 
 * @param depNames Name of module to require from cache, or an array of
 * module names to fetch
 * @param callback Optional callback, only used when first parameter is
 * an array of module names. The callback is called once all the modules
 * have been fetched.
 */
export function legacyRequire(moduleName: string): unknown;
export function legacyRequire(depNames: string[]): Promise<unknown[]>;
export function legacyRequire(depNames: string[], callback: (...dependencies: unknown[]) => void): void;
export function legacyRequire(
    depNames: string | string[],
    callback?: (...dependencies: unknown[]) => void
) {
    if (typeof depNames === "string") {
        return directRequire(depNames, {
            returnDefaultExport: importJSOptions.amdReturnDefaultExport
        });
    } else if (
        !Array.isArray(depNames) ||
        depNames.some(dep => typeof dep !== "string")
    ) {
        throw new TypeError("Invalid require parameters");
    }

    const dependencies = Promise.all(
        depNames.map(dep =>
            load(dep, {
                returnDefaultExport: importJSOptions.amdReturnDefaultExport
            })
        )
    );
    if (callback === undefined) {
        return dependencies;
    }
    dependencies.then((loadedDeps: unknown[]) => callback(...loadedDeps));
};
