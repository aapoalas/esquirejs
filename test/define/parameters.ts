/**
 * Original Work Copyright 2019 Valmet Automation Inc.
 */

import tape from "tape";
import { define } from "../../src/define";

tape("Define function", ({ test }) => {
    test("Anonymous define with no parameters", t => {
        t.plan(1);
        const moduleFactory = function() {
            t.deepEqual(Array.from(arguments), []);
        };
        define(moduleFactory);
    });

    test("Named define with no parameters", t => {
        t.plan(1);
        const moduleFactory = function() {
            t.deepEqual(Array.from(arguments), []);
        };
        define("named-define-no-parameters", moduleFactory);
    });
});
