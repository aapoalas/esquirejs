/**
 * Original Work Copyright 2019 Valmet Automation Inc.
 */

/**
 * provisionsMap is a map to contain two things:
 * 1. Pre-provided libraries, such as React.
 *    This is done using the below `provide` function with eg. `provide("name", module)`.
 * 2. Built AMD modules. The `define` function creates these.
 * 3. One anonymous AMD module with the key `undefined`. These are always temporary and are expected
 *    to be claimed and named by a `load` call (through `resolveModule`) within the same task.
 * 4. If the EsquireJS option `cacheESModules` is set: ECMAScript modules, cached by their load name.
 *
 * Thus, during runtime the provisionsMap might look something like as follows:
 * Map {
 *     "react" => React,
 *     "example-loader!/example/path" => { exampleData: "foo" },
 *     undefined => { exampleAnonymousData: "bar" },
 *     "./ecma-module.js" => Module,
 * }
 */
const provisionsMap = new Map<undefined | string, unknown>();

/**
 * asyncProvisionsMap is a map to contain zero-parameter functions that return a Promise
 * of the named module. It is meant to be used in conjunction with eg. Webpack's own
 * `import("module")` functionality.
 *
 * As an example, if a web application has a dynamic dependency on D3 and an AMD module
 * loaded through EsquireJS might also depend on D3, then a function to initialize the
 * Webpack dynamic loading of D3 can be provided to EsquireJS using
 * `provideAsync("d3", () => import("d3"))`.
 *
 * The map is also used by the `define` function when either defined module building is set to
 * be deferred, or when a module cannot be built synchronously. This includes a single
 * anonymous module as above with `provisionsMap`. When these modules are requested from the
 * map, the `getModule` function will take care of making sure module duplication cannot
 * occur, and eventually also handles
 *
 * Thus, during runtime the asyncProvisionsMap might look something like as follows:
 * Map {
 *     "d3" => () => import("d3"),
 *     "example-loader!/example/path" => () => Promise.resolve(...),
 *     undefined => Promise.resolve(...),
 * }
 */
const asyncProvisionsMap = new Map<
    undefined | string,
    () => Promise<unknown>
>();

/**
 * Provide a module to EsquireJS
 * @param name Name of module (used by eg. AMD modules)
 * @param payload Module
 */
export const provide = (name: string, payload: unknown): void => {
    if (provisionsMap.has(name) || asyncProvisionsMap.has(name)) {
        throw new Error(`Module ${name} is already provided`);
    }
    provisionsMap.set(name, payload);
};

export const provideAnonymousModule = (payload: unknown): void => {
    provisionsMap.set(undefined, payload);
};

/**
 * Provide an asynchronously loadable module to EsquireJS
 * @param name Name of module (used by eg. AMD modules)
 * @param payload Zero-parameter function that returns a Promise of the module
 */
export const provideAsync = (
    name: string,
    payload: () => Promise<unknown>
): void => {
    if (provisionsMap.has(name) || asyncProvisionsMap.has(name)) {
        throw new Error(`Module ${name} is already provided`);
    }
    asyncProvisionsMap.set(name, payload);
};

export const provideAnonymousModuleAsync = (
    payload: () => Promise<unknown>
): void => {
    asyncProvisionsMap.set(undefined, payload);
};

export const hasModule = (name: string): boolean =>
    provisionsMap.has(name) || asyncProvisionsMap.has(name);
export const hasSyncModule = (name: string): boolean => provisionsMap.has(name);
export const hasAnonymousModule = (): boolean =>
    provisionsMap.has(undefined) || asyncProvisionsMap.has(undefined);

const internalLoadPromises = new WeakSet<Promise<unknown>>();
export const getModule = (name: string): unknown | Promise<unknown> => {
    if (provisionsMap.has(name)) {
        return provisionsMap.get(name)!;
    }
    // When a async module load is first initiated, we want to call the
    // function to generate the promise, and then push that generated promise
    // back into the asyncProvisionMap to make sure we do not duplicate the module.
    let modulePromise = asyncProvisionsMap.get(name)!();
    if (!internalLoadPromises.has(modulePromise)) {
        modulePromise = modulePromise.then(moduleData => {
            asyncProvisionsMap.delete(name);
            internalLoadPromises.delete(modulePromise);
            provide(name, moduleData);
            return moduleData;
        });
        asyncProvisionsMap.set(name, () => modulePromise);
        internalLoadPromises.add(modulePromise);
    }
    return modulePromise;
};

export const renameModule = (newName: string, previousName?: string): void => {
    if (provisionsMap.has(previousName)) {
        const moduleData = provisionsMap.get(previousName)!;
        provisionsMap.delete(previousName);
        provide(newName, moduleData);
    } else if (asyncProvisionsMap.has(previousName)) {
        const moduleData = asyncProvisionsMap.get(previousName)!;
        asyncProvisionsMap.delete(previousName);
        provideAsync(newName, moduleData);
    }
};

export const undefine = (name: string) => {
    if (provisionsMap.has(name)) {
        provisionsMap.delete(name);
    }
    if (asyncProvisionsMap.has(name)) {
        asyncProvisionsMap.delete(name);
    }
};