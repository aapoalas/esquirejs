/* Copyright 2019 Valmet Automation Inc.
 *
 * This document is the exclusive intellectual property of Valmet Automation Inc.
 * and/or its subsidiaries (collectively "Valmet Automation") and is furnished
 * solely for operating and maintaining the supplied equipment and/or software.
 * Use of the document for any other project or purpose is prohibited.
 * All copyrights to the document are reserved by Valmet Automation. Accordingly,
 * the document or the information contained therein shall not (whether partly or entirely)
 * be reproduced, copied or disclosed to a third party without prior written consent of Valmet Automation.
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
