/**
 * Original Work Copyright 2019 Valmet Automation Inc.
 */

import { ImportJSOptions } from "../options.ts";
import { LoadFunction } from "../plugins.ts";

let fetchOptions: undefined | RequestInit;

export const load = async (
    url: string,
    loadAsync: LoadFunction,
    options: Readonly<ImportJSOptions>
): Promise<unknown> => {
    if (url.includes(options.separator)) {
        if (url.split(options.separator).includes("json")) {
            throw new Error("json! and text! cannot be chained.");
        }
        // splice "text!" to be the last loader and reload;
        const lastSeparatorIndex = url.lastIndexOf(options.separator);
        return loadAsync(
            `${url.substring(0, lastSeparatorIndex + 1)}text${
                options.separator
            }${url.substring(lastSeparatorIndex + 1)}`
        );
    }
    const response = await fetch(url, fetchOptions);
    return response.text();
};

export const setOptions = (options: RequestInit) => {
    fetchOptions = options;
}