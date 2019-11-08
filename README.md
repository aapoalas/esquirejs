# [EsquireJS](https://github.com/aapoalas/esquirejs)
EsquireJS is an ECMAScript file and module loader for the modern period.

The library is intended to bridge the gap between ECMAScript and Asynchronous Module Definition (AMD) modules. This allows for a smooth transition from [RequireJS](https://requirejs.org/) based asynchronous module loading into ES dynamic importing.

This library is not for everyone. If your project does not use RequireJS then this library is not likely something you want to spend another minute looking at. If your project requires on loading asynchronous, dynamic JavaScript modules and you've been stuck with using RequireJS for that, then this library may well be what you've been waiting for. The library is still not a complete drop-in replacement for RequireJS. Some APIs are not 100% the same and some features are not supported at this moment.

## Features
EsquireJS supports both ES and AMD module loading and provides a plugin API to expand the feature set in userland. With AMD modules, both named and anonymous modules are supported. JSON, HTML and CSS files (based on file name extension) are automatically fetched as strings.

* **Define**: The `define` function supports named and anonymous modules, dependency definition arrays, module data and factory formats and the special `exports`, `require`, and `module` dependencies.

```javascript
import { define } from "esquirejs";

// Anonymous module data
define({
    foo: 3
});
// Anonymous module factory with special `exports` dependency
define((exports) => {
    exports.foo = 3;
})
// Named module factory with dependency array
define("my-module", ["lodash"], function myModule(_) {
    return {
        foo: _.clamp(3, Math.random(), 3),
    };
});
```

* **Load**: The main import function for EsquireJS is the `load` function. It takes a module name and a second, optional options argument, and returns a Promise for required the module. The load logic can be extended by using the plugin API.

* **Require**: The `legacyRequire` function works similarly to RequireJS's `require` function. Given a module name, EsquireJS will attempt to fetch a module with the given name from its cache and throws an error if no such module has been loaded or provided. Given an array of module names, EsquireJS will fetch all the modules from cache or asynchronously and either returns a Promise for an array of the modules, or calls the callback given as a second parameter to the function.

```javascript
import { legacyRequire } from "esquirejs";

// Synchronous require
const _ = legacyRequire("lodash");

// Asynchronous, Promise-based require
const [myModule] = await legacyRequire(["my-module"]);

// Asynchronous, callback-based require
legacyRequire(["my-module"], myModule => {
    console.log(myModule.foo); // 3
});
```

* **Provide**: The `provide` API can be used to synchronously provide modules into the EsquireJS cache without having to wrap them in `define` calls or anything of the sort. It is mainly intended for providing eg. Webpack-built modules for AMD modules to use.

Example: The main app uses **lodash** and it is built into the vendor bundle. At the same time asynchronously loaded AMD modules want to use the library as well. This can be achieved as simply as:

```javascript
import { provide } from "esquirejs";
import * as _ from "lodash";

provide("lodash", _);
```

* **Asynchronous provide**: The `provideAsync` API can be used to provide module loading functions into the EsquireJS cache. This is mainly intended for providing dynamically imported modules built by eg. Webpack for AMD modules to load on demand.

Example: The main app doesn't use **d3** but it must be available for asynchronously loaded AMD to use in case they need it. Synchronously providing the library would be an option but would bloat up the vendor bundle with a library that is not actually used by the application at all. In this case both the aims can be achieved with:

```javascript
import { provideAsync } from "esquirejs";

provideAsync("d3", () => import("d3"));
```

If this is built by Webpack, the `import("d3")` will be changed to a dynamic Webpack import. EsquireJS will keep this module load function in its asynchronous cache and if some module requests **d3** then the function will be executed and the result saved into the EsquireJS synchronous cache.

### Missing features compared to RequireJS
EsquireJS is not a complete drop-in replace for RequireJS. Most of the advanced features of RequireJS (and even a few of the basic ones) are missing at present.

* **Base URL**: RequireJS offers support to change the base URL from which all requests are made from. This is not yet supported in EsquireJS but is considered high priority.
* **Undef**: RequireJS offers support for module undefining. This is not yet supported in EsquireJS but is considered high priority (and low effort).
* **Timeout**: RequireJS offers support for automatic load timeouts. This is not yet supported in EsquireJS but is considered medium priority.
* **Relative AMD imports**: RequireJS can calculate and normalize paths from AMD modules to relative imports. Since this is natively supported with ES modules, this is not a high priority for EsquireJS.
* **Paths and shim configuration**: RequireJS offers a method to configure module paths and shims. Since these sort of imports are generally better left for bundlers such as Rollup or Webpack, this is not a high priority for EsquireJS.
* **Context**: RequireJS offers support for multiple loading contexts. This allows for eg. multiple versions of the same library to be used on the same page, both referred to by the same name but used in different loading contexts. This has not been seen as an important feature and is thus not a high priority for EsquireJS.

## Usage
To drop-in replace simple RequireJS usage with EsquireJS, remove `<script src="requirejs.js"></script>` from your `index.html` and add the following code into your `index.js`:

```javascript
// Import the simple `setup` function from esquirejs
import { setup } from "esquirejs/esquirejs";
setup();
```

The `setup` function setups the basic load plugins, and exposes the `legacyRequire` (as `require`) and `define` functions into the `window` object.

If more control is preferred, something as follows should be used:
```javascript
import { define, provide, defineBasePlugin, definePlugin, plugins } from "esquirejs";

// Expose define to global scope; notably leave require out
window.define = define;

const basePlugin = plugins.base;
basePlugin.setOptions({ crossOrigin: "use-credentials" }); // Send credentials to cross-origin locations
defineBasePlugin(
    // This plugin uses dynamic import without <script> tag usage
    // and will fail if used in Chrome browser with 'strict-dynamic'
    // and nonce CSP headers.
    plugins.base
);
definePlugin(
    "json",
    plugins.json
);
definePlugin(
    "text",
    plugins.text
);
```

## Mechanics
EsquireJS offers two base plugins for loading JavaScript modules.

The base plugin uses the [ECMAScript dynamic import()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import). This base plugin is exported as `plugins.base`.

The secondary base plugin uses the traditional `<script>` tag appending. Compared to RequireJS the tag module type is set to `"module"` and thus supports ES module imports and exports. Once the script has finished loading the plugin then calls the dynamic `import()` method on the same module URL and returns the result, giving access to any exports in the module. Since the module had already been loaded and executed by the script tag, the module is simply returned from browser cache and does not cause a new HTTP request. This base plugin is exported as `plugins.scriptBase`. The reason for this plugin's existence is a [Chrome bug](https://bugs.chromium.org/p/chromium/issues/detail?id=979351) that causes dynamic imports to fail on subsequent loads of modules when 'strict-dynamic' and nonce CSP are used.

Note that all modules imported by EsquireJS are run in strict mode and as "module" type scripts, meaning that the `this` of the modules is not `window` but `undefined`. This should generally not cause any issue.

## Interoperating between ES and AMD modules
EsquireJS is first and foremost intended to create a seamless bridge between AMD and ES module loading. Interoperating between the two module worlds is very easy from the direction of AMD into ES modules. The reverse is somewhat more complex.

### Loading ES modules from inside AMD modules
Since EsquireJS can load both AMD and ES modules, an AMD module should simply define a dependency on an ES module and it should be loaded with no issue.

```javascript
// es-module.js
export default function roundToNearestThree(number) {
    return 3;
};

// path/amd-module.js
define(["/es-module.js"], roundToNearestThree => {
    return roundToNearestThree(6);
});

// main.js
import { load } from "esquirejs";

load("/path/amd-module.js").then(result => {
    console.log(result); // 3
});
```

As seen, the AMD module automatically receives the default export from `es-module.js` when there are no other exports in the ES module. This behaviour can be controlled by the `amdReturnDefaultExport` EsquireJS option.

### Loading AMD modules from inside ES modules
Loading AMD modules from inside ES modules is not a significant challenge as long as the resource path is known. The only issue is how to get access to the return value of the AMD module. For this, the `legacyRequire` or `directRequire` function needs to be exposed to the global scope and the AMD module must be named with the name being known to the ES module.

```javascript
// path/amd-module.js
define("function-results", {
    foo: 3,
    bar: 3,
});

// path/es-module.js
import "./amd-module.js";
const { foo, bar } = globalThis.directRequire("function-results");
export const results = [foo, bar];

// main.js
import { load } from "esquirejs";

load("path/es-module.js").then(({ results }) => {
    console.log(results); // [3, 3]
});
```

## Plugin API
EsquireJS has a plugin API similar to RequireJS but powered by Promises. A plugin needs to export only a single method, `load`, to be functional. The signature of the `load` function as follows:

* Parameters:
  * `moduleName`: String defining the resource to be loaded. The name may contain other plugin name prefixes.
  * `load`: Internal EsquireJS load function. If the plugin wants to eg. use the defined base plugin to load a resource, it should call this function with the resource path (possibly prefixed with any needed plugin names) and return the result.
  * `options`: EsquireJS's current options. The current options are passed to the plugin as a frozen object.
* Return value:
  * The plugin `load` function should return the result of the load, be that a value or a Promise for the value. If the plugin uses the internal EsquireJS load function, its return value must be returned.

### Defining and using plugins
Plugins are defined using the `definePlugin` and `defineBasePlugin` APIs. The base plugin takes care of loading all modules that are not explicitly set for any other plugins to load, eg. `"./module.js"` gets passed onto the base plugin for loading. Other plugins are used by explicitly prefixing the plugin name onto the module name, eg. `"my-plugin!lodash"` gets passed onto the plugin defined with the name `"my-plugin"` (or asynchronously provided module of the same name, in which case the module is first loaded and defined as a plugin). The separator for plugin name prefixes is by default `"!"` but this can be changed through the `separator` EsquireJS option.