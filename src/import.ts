import { init } from "./lib/mkpp3_core";
import {stdin, stdout, exit} from "process";

// const prompts = require("prompts");
const readline = require("node:readline/promises");

async function importFromConsole(){
    // const response = await prompts({ type: 'text', name: 'value', message: 'Paste row from response spreadsheet:' });
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const response: string = await rl.question("Paste row from response spreadsheet:\n");
    let result = response.split("\t").map(x => x.trim()).map(x=>0 == x.length? undefined: x);
    let [timestamp, performer, character, species, maker, website, fa, instagram, telegram, tiktok, twitter, site1, link1, site2, link2, site3, link3, discord] = result;
    console.log(JSON.stringify({ timestamp, performer, character, species, maker, website, fa, instagram, telegram, tiktok, twitter, site1, link1, site2, link2, site3, link3, discord }, null, "    "));
}

async function main(){
    try {
        const f = await init();
        while (true)
        {
            try {
                await importFromConsole();
            } catch (error) {
                throw error;
            }
        }
    } catch (error) {
        throw error;
    }
}
main().catch(error => console.error(error));
