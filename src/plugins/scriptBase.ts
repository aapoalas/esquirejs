/**
 * Original Work Copyright 2019 Valmet Automation Inc.
 */

import { ImportJSOptions } from "../options";
import { LoadFunction } from "../plugins";

export const enum CORS {
	"Same Origin" = "anonymous",
	"Include" = "use-credentials",
	"Empty String Same Origin" = "",
};

const isJSONURL = (url: string): boolean => url.endsWith(".json");

const isHTMLTextURL = (url: string): boolean =>
    url.endsWith(".html") || url.endsWith(".css");

const HEAD_EL = document.getElementsByTagName("head")[0];
const LISTENER_OPTIONS = { once: true };

let crossOrigin: CORS = CORS["Same Origin"];

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
    return new Promise((res, rej) => {
		const script = document.createElement("script");
        script.crossOrigin = crossOrigin;
        script.src = url;
        script.type = "module";
        const onload = () => {
            script.remove();
            res(import(/* webpackIgnore: true */ url));
        };
        const onerror = (error: ErrorEvent) => {
            script.remove();
            rej(error);
        };
        script.addEventListener("load", onload, LISTENER_OPTIONS);
        script.addEventListener("error", onerror, LISTENER_OPTIONS);
        HEAD_EL.append(script);
    });
};

export const setOptions = ({ crossOrigin: CORS }: { crossOrigin: CORS }) => {
    crossOrigin = CORS;
}