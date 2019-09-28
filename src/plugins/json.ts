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
    const response = await fetch(url);
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
