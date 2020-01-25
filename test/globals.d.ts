import { define } from "../src/define";

declare global {
    interface Window {
        define: typeof define;
    }
}