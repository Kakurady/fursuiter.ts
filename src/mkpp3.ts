import { init } from "./lib/mkpp3_core";
import { start } from "repl";

async function main(){
    try {
        const f = await init();
        const r = start({prompt: ">> ", useGlobal: false});
        r.context.m = "msg";
        Object.assign(r.context, f);
    } catch (error) {
        throw error;
    }
}
main().catch(error => console.error(error));