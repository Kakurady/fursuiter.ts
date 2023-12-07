import { init } from "./lib/mkpp3_core";
import {stdin, stdout, exit} from "process";
import { CharacterRecord, SiteName } from "./lib/types";

const prompts = require("prompts");
const zxcvbn = require("zxcvbn");
const readline = require("node:readline/promises");

async function importFromConsole(){
    // const response = await prompts({ type: 'text', name: 'value', message: 'Paste row from response spreadsheet:' });
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const response: string = await rl.question("Paste row from response spreadsheet:\n");
    rl.close();
    let result = response.split("\t").map(x => x.trim()).map(x=>0 == x.length? undefined: x);
    let [timestamp, performer, character, species_s, maker_s, web, fa, instagram, telegram, tiktok, twitter, site1, link1, site2, link2, site3, link3, discord] = result;

    // because Gboard will capitalize the first letter in each input field, including common species such as "Fox", undo that here.
    // this will lower-case proper nouns such as "Pokémon" or "Neopet" as an unwanted effect, but let's fix that by hand afterwards.
    let species = species_s && species_s.split("\t").map(x => x.trim().toLowerCase()) || [];
    let maker = maker_s && maker_s.split("\t").map(x => x.trim()) || [];
    let characterRecord: CharacterRecord = { name: character, performer, maker, species };
    // convert write-in entries
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
    // transfer performer name to character name field, if character name is blank
    if (performer && !character)
    {
        characterRecord.name = character;
        delete characterRecord.performer;
    }

    characterRecord.on = on;
    console.log(characterRecord);

    function getCandidateFilename()
    {
        // strip accents: https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript
        // this is not strictly accurate (for example, it might make more sense to convert Ü into UE), but close enough for our purposes
        let name_words = characterRecord.name.toLowerCase().normalize("NFKD").replace(/(\p{Diacritic}|[\-'&\?/])/gu, "").split(" ");
        // check how "common" the name is using a password strength checker
        let entropy = zxcvbn(name_words[0]).guesses_log10;
        if (entropy >= 5)
        {
            // the name is pretty uncommon (one in 100,000), use it as-is
            return name_words[0];
        }
        if (characterRecord.species[0] && typeof characterRecord.species[0] == "string")
        {
            // a species is available, use `name_species`
            let species = characterRecord.species[0].toLowerCase().normalize("NFKD").replace(/(\p{Diacritic}|[\-'&\?/])/gu, "").replace(/ /g, "_");
            return `${name_words[0]}_${species}`;
        }
        return name_words.join("_");
    }
    let candidateFilename = getCandidateFilename();
    let filename = await prompts([{name: "filename", type: "text", message: "Enter filename for character record: ", initial: candidateFilename}]);
    console.log(filename);
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
