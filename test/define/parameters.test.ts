/**
 * Original Work Copyright 2019 Valmet Automation Inc.
 */

import * as tape from "tape";
import { define, load, setOptions } from "../../index.ts";

tape("Define function", ({ test }) => {
    test("Anonymous define with no parameters", t => {
        setOptions({
            deferDefineLoads: false,
        });
        t.plan(1);
        const moduleFactory = function () {
            t.deepEqual(Array.from(arguments), []);
            return "key-anonymous-define-no-parameters"
        };
        define(moduleFactory);
    });

    test("Named define with no parameters, deferred", async t => {
        setOptions({
            deferDefineLoads: true,
        });
        t.plan(2);
        const moduleFactory = function () {
            t.deepEqual(Array.from(arguments), []);
            return "key-named-define-no-parameters-deferred"
        };
        define("named-define-no-parameters-deferred", moduleFactory);
        const value = await load("named-define-no-parameters-deferred");
        t.equal(value, "key-named-define-no-parameters-deferred");
    });

    test("Named define with no parameters, undeferred", async t => {
        setOptions({
            deferDefineLoads: true,
        });
        t.plan(2);
        const moduleFactory = function () {
            t.deepEqual(Array.from(arguments), []);
            return "key-named-define-no-parameters-undeferred"
        };
        define("named-define-no-parameters-undeferred", moduleFactory);
        const value = await load("named-define-no-parameters-undeferred");
        t.equal(value, "key-named-define-no-parameters-undeferred");
    });

    test("Anonymous define with parameters", t => {
        setOptions({
            deferDefineLoads: false,
        });
        t.plan(1);
        const moduleFactory = function () {
            t.deepEqual(Array.from(arguments), ["key-named-define-no-parameters-undeferred"]);
            return "key-anonymous-define-with-parameters"
        };
        define(["named-define-no-parameters-undeferred"], moduleFactory);
    });

    test("Named define with parameters, deferred", async t => {
        setOptions({
            deferDefineLoads: true,
        });
        t.plan(2);
        const moduleFactory = function () {
            t.deepEqual(Array.from(arguments), [
                "key-named-define-no-parameters-deferred",
                "key-named-define-no-parameters-undeferred"
            ]);
            return "key-named-define-with-parameters-deferred"
        };
        define("named-define-with-parameters-deferred", ["named-define-no-parameters-deferred", "named-define-no-parameters-undeferred"], moduleFactory);
        const value = await load("named-define-with-parameters-deferred");
        t.equal(value, "key-named-define-with-parameters-deferred");
    })

    test("Named define with parameters, undeferred", async t => {
        setOptions({
            deferDefineLoads: true,
        });
        t.plan(2);
        const moduleFactory = function () {
            t.deepEqual(Array.from(arguments), [
                "key-named-define-no-parameters-deferred",
                "key-named-define-no-parameters-undeferred"
            ]);
            return "key-named-define-with-parameters-undeferred"
        };
        define("named-define-with-parameters-undeferred", ["named-define-no-parameters-deferred", "named-define-no-parameters-undeferred"], moduleFactory);
        const value = await load("named-define-with-parameters-undeferred");
        t.equal(value, "key-named-define-with-parameters-undeferred");
    });

    test("'require' parameter without explicit parameter name", t => {
        t.plan(3);
        const moduleFactory = function (require) {
            t.equal(typeof require, "function");
            const requireFunction = require;
            const value = requireFunction("named-define-with-parameters-undeferred");
            t.equal(value, "key-named-define-with-parameters-undeferred");
            t.throws(() => requireFunction("not-loaded-module"));
        };
        define("require-test", moduleFactory);
        load("require-test");
    });

    test("'require' parameter with explicit parameter name", t => {
        t.plan(3);
        const moduleFactory = function (requireFunction) {
            t.equal(typeof requireFunction, "function");
            const value = requireFunction("named-define-with-parameters-undeferred");
            t.equal(value, "key-named-define-with-parameters-undeferred");
            t.throws(() => requireFunction("not-loaded-module"));
        };
        define("require-test-explicit", ["require"], moduleFactory);
        load("require-test-explicit");
    });

    test("'exports' parameter without explicit parameter name", async t => {
        t.plan(2);
        let exportsValue;
        const moduleFactory = function (exports) {
            t.deepEqual(exports, {});
            exportsValue = exports;
        };
        define("exports-test", moduleFactory);
        const value = await load("exports-test");
        t.equal(value, exportsValue);
    });

    test("'exports' parameter with explicit parameter name", async t => {
        t.plan(2);
        let exportsValue;
        const moduleFactory = function (exports) {
            t.deepEqual(exports, {});
            exportsValue = exports;
        };
        define("exports-test-explicit", ["exports"], moduleFactory);
        const value = await load("exports-test-explicit");
        t.equal(value, exportsValue);
    });

    test("'module' parameter without explicit parameter name", async t => {
        t.plan(2);
        let moduleValue;
        const moduleFactory = function (module) {
            t.deepEqual(module, {
                id: "",
                uri: "",
                config: {},
                exports: {},
            });
            moduleValue = module;
        };
        define("module-test", moduleFactory);
        const value = await load("module-test");
        t.equal(value, moduleValue.exports);
    });

    test("'module' parameter with explicit parameter name", async t => {
        t.plan(2);
        let moduleValue;
        const moduleFactory = function (module) {
            t.deepEqual(module, {
                id: "",
                uri: "",
                config: {},
                exports: {},
            });
            moduleValue = module;
        };
        define("module-test-explicit", ["module"], moduleFactory);
        const value = await load("module-test-explicit");
        t.equal(value, moduleValue.exports);
    });
});
