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
