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

import {
    directRequire,
    load,
    recentlyDefinedModules,
    recentlyRedefinedModules,
} from "./load";
import { importJSOptions } from "./options";
import {
    hasModule,
    hasSyncModule,
    provide,
    provideAnonymousModule,
    provideAnonymousModuleAsync,
    provideAsync,
} from "./provide";

type DefineDependencyNames = string[];
type DefineModuleFactory = (...dependencies: any[]) => any;
type DefineModuleData = string | object | number;

const EXPORTS_DEPENDENCY = "exports";
const REQUIRE_DEPENDENCY = "require";
const MODULE_DEPENDENCY = "module";
const SPECIAL_DEPENDENCY_KEYS = [
    EXPORTS_DEPENDENCY,
    REQUIRE_DEPENDENCY,
    MODULE_DEPENDENCY,
];

// Monster of a regular expression that understands synchronous and asynchronous
// JavaScript functions, both normal and arrow functions (with or without parentheses)
const PARAMETERS_REGEX = /^(?:async\s+)?(?:function(?:\s+\w+)?\s*\(([^)]*)\)\s*{|(?:\(([^)]*)\)|(\w+))\s*=>)/;

const parseFunctionParameters = (func: Function) => {
    const funcString = func.toString();
    if (PARAMETERS_REGEX.test(funcString)) {
        return PARAMETERS_REGEX.exec(funcString)![1]
            .split(",")
            .map(param => param.trim());
    }
};

const handleUndefinedDependencyNames = (moduleFactory: Function) => {
    if (moduleFactory.length !== 0) {
        // These dependencies are likely 'require', 'exports', and 'module'
        const depNames = parseFunctionParameters(moduleFactory);
        if (
            depNames &&
            depNames.some(dep => !SPECIAL_DEPENDENCY_KEYS.includes(dep))
        ) {
            const unknownDependencyKeys = depNames.filter(
                dep => !SPECIAL_DEPENDENCY_KEYS.includes(dep)
            );
            console.log(
                `AMD module has unlisted, unknown dependencies`,
                unknownDependencyKeys.reduce((acc, key, index) =>
                    acc.concat(
                        index === unknownDependencyKeys.length - 1
                            ? ", and "
                            : ", ",
                        `'${key}'`
                    )
                )
            );
        }
        if (depNames) {
            return depNames;
        }
    }
    return [];
};

const shouldModuleLoadBeDelayed = (depNames: string[]) =>
    depNames.length > 0 &&
    depNames.some(
        dep => !hasSyncModule(dep) && !SPECIAL_DEPENDENCY_KEYS.includes(dep)
    );

const moduleRequireFunction = (
    depNames: string | string[],
    callback?: (...dependencies: any[]) => void
) => {
    if (typeof depNames === "string") {
        return directRequire(depNames, {
            returnDefaultExport: importJSOptions.amdReturnDefaultExport,
        });
    } else if (callback === undefined) {
        return moduleRequireFunction;
    }
    const shouldDelayProcessing = shouldModuleLoadBeDelayed(depNames);
    shouldDelayProcessing
        ? Promise.resolve()
              .then(() => resolveDependencies(depNames, {}))
              .then(loadedDeps => callback(loadedDeps))
        : callback(resolveDependencies(depNames, {}));
};

const resolveDependencies = (depNames: string[], exports?: {}) =>
    depNames.map(dep => {
        if (dep === EXPORTS_DEPENDENCY) {
            return exports!;
        } else if (dep === REQUIRE_DEPENDENCY) {
            return moduleRequireFunction;
        } else if (dep === MODULE_DEPENDENCY) {
            return {
                id: name,
                uri: name,
                config: {},
                exports,
            };
        } else if (!hasSyncModule(dep)) {
            return load(dep, {
                returnDefaultExport: importJSOptions.amdReturnDefaultExport,
            });
        }
        return directRequire(dep, {
            returnDefaultExport: importJSOptions.amdReturnDefaultExport,
        });
    });

const isDepArray = (d: any): d is DefineDependencyNames =>
    Array.isArray(d) && d.every((n: any) => typeof n === "string");
const isModuleFactory = (
    d: DefineModuleFactory | DefineModuleData
): d is DefineModuleFactory => typeof d === "function";

export function define(
    moduleData: DefineModuleData | DefineModuleFactory
): void;
export function define(name: string, moduleData: DefineModuleData): void;
export function define(
    arg0: string | DefineDependencyNames,
    moduleFactory: DefineModuleFactory
): void;
export function define(
    name: string,
    depNames: DefineDependencyNames,
    moduleFactory: DefineModuleFactory
): void;
export function define(...params: any[]) {
    let name: undefined | string;
    let depNames: undefined | DefineDependencyNames;
    let moduleFactory: undefined | DefineModuleFactory;
    let moduleData: any;

    if (params.length === 1) {
        const arg0 = params[0] as DefineModuleData | DefineModuleData;
        if (isModuleFactory(arg0)) {
            moduleFactory = arg0;
            depNames = handleUndefinedDependencyNames(moduleFactory);
        } else {
            // Probably intended as an anonymous resource
            moduleData = arg0;
        }
    } else if (params.length === 2) {
        const arg0 = params[0];
        const arg1 = params[1] as DefineModuleData | DefineModuleFactory;
        if (typeof arg0 === "string") {
            // Must be a named module
            name = arg0;
            if (isModuleFactory(arg1)) {
                moduleFactory = arg1;
                depNames = handleUndefinedDependencyNames(moduleFactory);
            } else {
                moduleData = arg1;
            }
        } else if (
            isDepArray(arg0) &&
            isModuleFactory(arg1) &&
            arg0.length >= arg1.length
        ) {
            depNames = arg0;
            moduleFactory = arg1;
        } else {
            throw new TypeError(
                "Invalid module parameters: " + JSON.stringify(params)
            );
        }
    } else if (params.length === 3) {
        const arg0 = params[0];
        const arg1 = params[1];
        const arg2 = params[2];
        if (
            typeof arg0 === "string" &&
            isDepArray(arg1) &&
            isModuleFactory(arg2) &&
            arg1.length >= arg2.length
        ) {
            name = arg0;
            depNames = arg1;
            moduleFactory = arg2;
        } else {
            throw new TypeError(
                "Invalid module parameters: " + JSON.stringify(params)
            );
        }
    } else {
        throw new TypeError(
            "Invalid module parameters: " + JSON.stringify(params)
        );
    }

    // If the module defines its own name and the name is new to us,
    // then we can safely provide the module immediately when it is done.
    // If the name is not new, we should avoid providing the module so as to
    // not overwrite a module that hasn't been unreferenced.
    const isNamed = typeof name === "string";
    const isNamedNewAMDModule = isNamed && !hasModule(name!);
    const isRedefinedAMDModule = isNamed && hasModule(name!);

    let defineAsync: boolean = importJSOptions.deferDefineLoads;
    if (depNames !== undefined && moduleFactory !== undefined) {
        // If the module requires 'exports' or 'module' we should synchronously
        // create and provide that object to both other modules and to the module itself
        const usesExports = depNames.some(
            dep => dep === EXPORTS_DEPENDENCY || dep === MODULE_DEPENDENCY
        );
        if (usesExports) {
            moduleData = {};
        }

        // If we're not set to defer loads and there are asynchronous or
        // missin dependencies, we need to delay the initialization of the
        // dependency loading. By delaying, we ensure that all synchronously
        // defined AMD modules (in a case where a single file has
        // multiple define calls) are synchronously defined
        // before their dependencies start loading. This, in turn,
        // ensures that those modules that are defined synchronously
        // with their dependencies will find their dependencies in the
        // provisionMap by the time the dependency loading begins.
        const shouldBuildDelayed =
            !defineAsync && shouldModuleLoadBeDelayed(depNames);
        if (defineAsync || shouldBuildDelayed) {
            // We should generate a function to asynchronously build the
            // module. If we are not set to defer loading, then the function
            // will be set to be invoked on the next tick and the result saved
            // as an asynchronous module definition.

            moduleData = () =>
                Promise.all(resolveDependencies(depNames!, moduleData)).then(
                    deps => {
                        const returnValue = moduleFactory!(...deps);
                        return usesExports ? moduleData : returnValue;
                    }
                );
            if (shouldBuildDelayed) {
                const moduleDataPromise = Promise.resolve().then(() =>
                    moduleData()
                );
                moduleData = () => moduleDataPromise;
            }
            // The 'moduleData' is here by necessity a function and such a function
            // that it will never leak out of this library. As such, it is safe for us
            // to attach metadata to it.
            moduleData.isAsync = true;
            defineAsync = true;
        } else {
            // If we're not deferring and all dependency modules are already
            // accounted for, we can simply synchronously build and provide
            // the module immediately.
            const returnValue = moduleFactory(
                ...resolveDependencies(depNames, moduleData)
            );
            if (!usesExports) {
                moduleData = returnValue;
            }
        }
    }

    if (isNamed) {
        if (isNamedNewAMDModule) {
            // A new module
            recentlyDefinedModules.add(name!);
            defineAsync
                ? provideAsync(name!, moduleData)
                : provide(name!, moduleData);
        } else {
            // A redefined module: We do not intend to overwrite
            // the previous module but we make note of this
            // redefinition because it might be that this module
            // was actually loaded with a different name (eg. "underscore")
            // than what it defines (eg. "lodash") and while the
            // defined name is already used, the name used for the
            // loading obviously was not. Thus we cache this module
            // to allow for the `load` function to find it.
            recentlyRedefinedModules.add(moduleData);
        }
    } else {
        defineAsync
            ? provideAnonymousModuleAsync(moduleData)
            : provideAnonymousModule(moduleData);
    }
}
