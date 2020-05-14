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

type OptionNames = keyof ImportJSOptions;

const PLUGIN_NAME_SEPARATOR = "!" as const;

export const importJSOptions: ImportJSOptions = {
    amdReturnDefaultExport: true,
    baseUrl: Deno.cwd(),
    cacheESModules: false,
    deferDefineLoads: true,
    returnDefaultExport: true,
    separator: PLUGIN_NAME_SEPARATOR,
};

export const getOptions = () => ({
    ...importJSOptions,
});

const isProperOption = (optionName: string): optionName is OptionNames => importJSOptions.hasOwnProperty(optionName);

export const setOptions = (options: Partial<ImportJSOptions>) => {
    for (const option in options) {
        if (
            isProperOption(option) &&
            typeof options[option] === typeof importJSOptions[option]
        ) {
            // @ts-ignore
            importJSOptions[option] = options[option];
        } else {
            console.error("Invalid ImportJS option", option);
        }
    }
};
