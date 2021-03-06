/**
 * Original Work Copyright 2019 Valmet Automation Inc.
 */

import { ImportJSOptions } from "../options";
import { LoadFunction } from "../plugins";

const isJSONURL = (url: string): boolean => url.endsWith(".json");

const isHTMLTextURL = (url: string): boolean =>
    url.endsWith(".html") || url.endsWith(".css");

export const load = async (
    url: string,
    loadAsync: LoadFunction,
    options: Readonly<ImportJSOptions>
): Promise<unknown> => {
    if (isJSONURL(url)) {
        return loadAsync(`json${options.separator}${url}`);
    } else if (isHTMLTextURL(url)) {
        return loadAsync(`text${options.separator}${url}`);
    }
    return import(/* webpackIgnore: true */ url);
};
