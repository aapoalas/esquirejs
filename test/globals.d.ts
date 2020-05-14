import { define } from "../src/define.ts";

declare global {
    interface Window {
        define: typeof define;
    }
}