/**
 * Original Work Copyright 2019 Valmet Automation Inc.
 */

export interface ImportJSOptions {
    amdReturnDefaultExport: boolean;
    baseUrl: string;
    cacheESModules: boolean;
    deferDefineLoads: boolean;
    returnDefaultExport: boolean;
    separator: string;
}

const PLUGIN_NAME_SEPARATOR = "!" as const;

export const importJSOptions: ImportJSOptions = {
    amdReturnDefaultExport: true,
    baseUrl: window.location.href,
    cacheESModules: false,
    deferDefineLoads: true,
    returnDefaultExport: true,
    separator: PLUGIN_NAME_SEPARATOR,
};

export const getOptions = () => ({
    ...importJSOptions,
});

export const setOptions = (options: Partial<ImportJSOptions>) => {
    for (const option in options) {
        if (
            importJSOptions.hasOwnProperty(option) &&
            typeof option === typeof importJSOptions[option]
        ) {
            importJSOptions[option] = options[option];
        } else {
            console.error("Invalid ImportJS option", option);
        }
    }
};
