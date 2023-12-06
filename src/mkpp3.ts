import { init } from "./lib/mkpp3_core";
import { start } from "repl";

async function main(){
    try {
        const f = await init();
        // short names for exported items
        console.log("Frequently used objects and functions: \n");
        console.log("Character & performer list (live updates): fursuits (f), performers (p)");
        console.log("(To inspect character/performer, use ds.loadCharacter or ds.loadPerformer)");
        console.log("Write profile to file system: await convAndWrite() ( await w() )");
        console.log("Maintenance: findAllSpeciesAndTags");
        // console.log("Debug: ds");
        const r = start({prompt: ">> ", useGlobal: false});
        r.context.m = "msg";
        Object.assign(r.context, f);
    } catch (error) {
        throw error;
    }
}
main().catch(error => console.error(error));