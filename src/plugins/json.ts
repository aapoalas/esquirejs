/**
 * Original Work Copyright 2019 Valmet Automation Inc.
 */

import { ImportJSOptions } from "../options";
import { LoadFunction } from "../plugins";

let fetchOptions: undefined | RequestInit;

export const load = async (
    url: string,
    loadAsync: LoadFunction,
    options: Readonly<ImportJSOptions>
): Promise<unknown> => {
    if (url.includes(options.separator)) {
        if (url.split(options.separator).includes("text")) {
            throw new Error("json! and text! cannot be chained.");
        }
        // splice "json!" to be the last loader and reload;
        const lastSeparatorIndex = url.lastIndexOf(options.separator);
        return loadAsync(
            `${url.substring(0, lastSeparatorIndex + 1)}json${
                options.separator
            }${url.substring(lastSeparatorIndex + 1)}`
        );
    }
    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get("Content-Type");
    if (
        typeof contentType !== "string" ||
        !contentType.startsWith("application/json")
    ) {
        throw new Error(
            `The server responded with a non-JSON MIME type of "${contentType}".`
        );
    }
    return response.json();
};

export const setOptions = (options: RequestInit) => {
    fetchOptions = options;
};