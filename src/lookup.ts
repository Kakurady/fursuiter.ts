import { init } from "./lib/mkpp3_core";
import { stdin, stdout, exit } from "process";
import { CharacterRecord, DataSource, Performer, ProfileOptionsRecord, SiteName } from "./lib/types";
import { promisify } from "util";
import { execFile } from "child_process";
import prompts = require("prompts");
const readline = require("node:readline/promises");


async function readMetadataFromFileName(filename: string) {
    try {
        const execFileAsync = promisify(execFile);
        const result = await execFileAsync("exiftool", ["-j", filename]);
        const obj = JSON.parse(result.stdout);
        const {Headline, Keywords} = obj[0];
        const Abstract = obj[0]["Caption-Abstract"];
        return {Headline, Keywords, Abstract};
    } catch (error) {
        throw error;
    }
}

function* buildFurAffinityTags(keywords: string[]){
    let tags = [...replaceDashes(keywords)];
    for(const keyword of tags){
        var words = keyword.split(" ");
        yield* words;
    }
    for(const keyword of tags){
        var words = keyword.split(" ");
        if (words.length > 1){
            yield words.map(x=>x[0].toUpperCase().concat(x.slice(1))).join("");
        }
    }
    
}
function* replaceDashes(keywords: string[]){
    const underlined=/-/gi;
    const removed = /'/gi;
    for(const keyword of keywords){
        // TODO process "Pokémon"
        var kw = keyword;
        kw = kw.replace(underlined, "_");
        kw = kw.replace(removed, "");
        yield kw;
    }
}

function tagsToFurAffinity(tags:string[])
{
    return [...buildFurAffinityTags(tags)].join(" ");
}

function* buildWeasylTags(keywords: string[]){
    const underlined=/[ -]/gi;
    const removed = /'/gi;
    for(const keyword of keywords){
        // TODO process "Pokémon"
        var kw = keyword;
        kw = kw.replace(underlined, "_");
        kw = kw.replace(removed, "");
        yield kw;
    }
    // Need to also format these.
    //if (meta.city) yield meta.city;
    //if (meta.province_or_state) yield meta.province_or_state;
    //if (meta.country_or_primary_location_name) yield meta.country_or_primary_location_name;
    
}



async function lookup(description: string, tags: string[]) {
    try {

    } catch (error) {
        throw error;
    }
}

async function lookupFromFilename() {
    while (true) {
        try {
            // get filename from stdin
            const rl = readline.createInterface({ input: stdin, output: stdout });
            const response: string = await rl.question("Paste filename:\n");
            rl.close();
            if (0 == response.length) {
                const { doexit }: { doexit: boolean } = await prompts([{ name: "doexit", type: "confirm", message: "really exit?", initial: false }]);
                if (doexit) { break; }
            }
            const res = await readMetadataFromFileName(response);
            console.log(res.Headline);
            console.log();
            console.log(res.Abstract);
            console.log();
            console.log(tagsToFurAffinity(res.Keywords));
            console.log([...buildWeasylTags(res.Keywords)].join(" "));

        } catch (error) {
            console.log(error);
        }
    }
}

async function main() {

    try {
        await lookupFromFilename();
    } catch (error) {
        throw error;
    }
}
main().catch(error => console.error(error));
