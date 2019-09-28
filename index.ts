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

export { define } from "./src/define";
export {
    directRequire as require,
    load,
    registerErrorListener,
} from "./src/load";
export { getOptions, setOptions } from "./src/options";
export { definePlugin } from "./src/plugins";
export { provide, provideAsync } from "./src/provide";
