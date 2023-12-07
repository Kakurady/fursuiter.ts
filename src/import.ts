import { init } from "./lib/mkpp3_core";
import {stdin, stdout, exit} from "process";
import { CharacterRecord, SiteName } from "./lib/types";

// const prompts = require("prompts");
const readline = require("node:readline/promises");

async function importFromConsole(){
    // const response = await prompts({ type: 'text', name: 'value', message: 'Paste row from response spreadsheet:' });
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const response: string = await rl.question("Paste row from response spreadsheet:\n");
    rl.close();
    let result = response.split("\t").map(x => x.trim()).map(x=>0 == x.length? undefined: x);
    let [timestamp, performer, character, species_s, maker_s, web, fa, instagram, telegram, tiktok, twitter, site1, link1, site2, link2, site3, link3, discord] = result;

    let species = species_s && species_s.split("\t").map(x => x.trim().toLowerCase()) || [];
    let maker = maker_s && maker_s.split("\t").map(x => x.trim()) || [];
    let characterRecord: CharacterRecord = { name: character, performer, maker, species };
    let [on1, on2, on3] = [[site1, link1], [site2, link2], [site3, link3]].map(x => {
        let [site, link] = x;
        if (!site) { return; }
        if (!link) { return; }
        let lowerSite = site.toLowerCase();
        let ret: { [K in SiteName]?: string } = {};
        switch (lowerSite) {
            case "bluesky":
                ret["bsky"] = link; return ret;
            case "x":
                ret["twitter"] = link; return ret;
            case "second life":
                ret["second_life"] = link; return ret;
            case "bsky":
            case "cohost":
            case "da":
            case "discord":
            case "fa":
            case "facebook":
            case "flickr":
            case "furrynetwork":
            case "inkbunny":
            case "instagram":
            case "instagram_url":
            case "ko-fi":
            case "livejournal":
            case "mastodon":
            case "misskey":
            case "patreon":
            case "second_life":
            case "second_life_uuid":
            case "sofurry":
            case "telegram":
            case "threads":
            case "tiktok":
            case "tumblr":
            case "twitter":
            case "weasyl":
            case "web":
            case "youtube":
                ret[lowerSite] = link;
                return ret;
            default:
                console.warn(`not sure what to do with ${site}`);
                return ret;
        }
    });
    let on: { [K in SiteName]?: string } = {...on1, ...on2, ...on3, discord, fa, instagram, telegram, tiktok, twitter, web};
    for (const key in on) {
        if (on[key] == undefined) {
            delete on[key];
        }
    }
    if (performer && !character)
    {
        characterRecord.name = character;
        delete characterRecord.performer;
    }

    characterRecord.on = on;
    console.log(characterRecord);
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
