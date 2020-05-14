import { defineBasePlugin, definePlugin, load, plugins } from "https://raw.githubusercontent.com/aapoalas/esquirejs/deno/index.ts";

defineBasePlugin(plugins.base);
definePlugin("json", plugins.json);
definePlugin("text", plugins.text);

load("text!https://raw.githubusercontent.com/aapoalas/esquirejs/deno/index.ts");

