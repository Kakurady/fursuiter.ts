import { init } from "./lib/mkpp3_core";
import {stdin, stdout, exit} from "process";
import { CharacterRecord, DataSource, Performer, SiteName } from "./lib/types";
import {red, white, bold} from "kleur";

const prompts = require("prompts");
const zxcvbn = require("zxcvbn");
const readline = require("node:readline/promises");

async function importFromConsole(ds: DataSource, openEditor: (filename: string, type: "fursuit"| "performer" | "maker" | "event" | "species") => void) {
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
            case "furry network":
                ret["furrynetwork"] = link; return ret;
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
                console.warn(`${red("not sure what to do with")} ${white(bold(site))}`);
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
    if (performer && !character) {
        character = performer;
        performer = undefined;
    }
    else if (performer == character) {
        performer = undefined;
    }
    console.log({name: character, performer, maker, species, on});

    let newPerformer: Performer | string = performer && {"name": performer} || undefined;

    if (performer) {
        const resp = await prompts([{ name: "confirm", type: "confirm", message: "create new performer profile?", initial: true }]);
        if (resp.confirm) {
            const attachResp = await prompts([{ name: "confirm", type: "confirm", message: "Attach contact info to performer?", initial: true }]);
            const attachOnToPerformer = attachResp.confirm;
            if (attachOnToPerformer)
            {
                console.log({...newPerformer, ...on});
            }

            function getPerformerFilename() {
                const name_words = performer.toLowerCase().normalize("NFKD").replace(/(\p{Diacritic}|[\-'&\?/])/gu, "").split(" ");
                {
                    let entropy = zxcvbn(name_words[0]).guesses_log10;
                    if (entropy >= 5) {
                        // the name is pretty uncommon (one in 100,000), use it as-is
                        return name_words[0];
                    }
                }
                let name_underscore = name_words.join("_");
                if (name_words.length > 0) {
                    let entropy = zxcvbn(name_underscore[0]).guesses_log10;
                    if (entropy >= 5) {
                        return name_words[0];
                    }
                }
                for (const site in on)
                {
                    let onsite:string = on[site] || "";
                    let siteword =  onsite.toLowerCase().normalize("NFKD").replace(/(\p{Diacritic}|[\-'&\?/])/gu, "").replace(/ /g, "_");
                    let entropy = zxcvbn(on[site]).guesses_log10;
                    if (entropy >= 5) {
                        return siteword;
                    }
                }
                return name_underscore;
            }
            const perfCandidateFilename = getPerformerFilename();
            let filenameResponse = await prompts([{ name: "filename", type: "text", message: "Enter filename for performer record: ", initial: perfCandidateFilename }]);
            let perfFilename : string = filenameResponse.filename;
            if (perfFilename)
            {
                const oldPerformer = await ds.loadPerformer(perfFilename);
                
                if (oldPerformer)
                {
                    let newOn: {[K in SiteName]?: string} = on && attachOnToPerformer && oldPerformer.on && { ...oldPerformer.on, ...on } || attachOnToPerformer && on || oldPerformer.on || undefined;
                    console.log(bold("merge with existing data"));

                    newPerformer.on = newOn;

                    console.log(newPerformer);

                    let resp = await prompts([{ name: "confirm", type: "confirm", message: "write to the file system?" }]);
                    if (resp.confirm) {

                        await ds.savePerformer(perfFilename, newPerformer);
                        if (attachOnToPerformer) {
                            on = undefined;
                        }
                        performer = perfFilename;
                        console.log(`${white(bold(perfFilename))} saved!\n`);
                        openEditor(perfFilename, "performer");
                    }
                }
                else
                {
                    if (attachOnToPerformer)
                    {
                        newPerformer.on = on;
                    }

                    await ds.savePerformer(perfFilename, newPerformer);
                    if (attachOnToPerformer) {
                        on = undefined;
                    }
                    performer = perfFilename;
                    console.log(`${white(bold(perfFilename))} saved!\n`);
                    openEditor(perfFilename, "performer");
                }
            }
        }
    }

    let characterRecord: CharacterRecord = { name: character, performer, maker, species };


    function getCandidateFilename()
    {
        if (!characterRecord.name) {return;}
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
    // surprising behavior from prompts: enter takes default, but any key removes it. but tab allows you to edit it. almost as if the default is tab autocomplete, and the prompt starts blank. blank is default for many CLI so it makes sense, but usually the default value would be in parenthesis. autocomplete candidate should be lowlighted, which is not done here.
    let filenameResponse = await prompts([{ name: "filename", type: "text", message: "Enter filename for character record: ", initial: candidateFilename }]);
    let filename: string = filenameResponse.filename;
    console.log(filename);
    if (!filename) {
        console.log(red(`${bold(filename)} is empty!\n`))
        return;
    }
    let oldCharacter = await ds.loadCharacter(filename);
    let newCharacter: CharacterRecord = {};
    if (oldCharacter) {
        let newOn = { ...on, ...oldCharacter.on };
        let newSpecies = new Set([...species, ...oldCharacter.species]);
        let newMaker = new Set([...maker, ...oldCharacter.maker]);
        newCharacter = { name: character, performer, ...oldCharacter, on: { ...newOn }, maker: [...newMaker], species: [...newSpecies] };
        console.log(bold("merge with existing data"));
        console.log(newCharacter);
        let resp = await prompts([{ name: "confirm", type: "confirm", message: "write to the file system?" }]);
        if (resp.confirm) {
            ds.saveCharacter(filename, newCharacter);
            console.log(`${white(bold(filename))} saved!\n`)
        }
    }
    else {
        newCharacter = { ...characterRecord, on };
        ds.saveCharacter(filename, newCharacter);
        console.log(`${white(bold(filename))} saved!\n`)
    }
    // TODO: check if file exists and offer to merge if appropriate
}

async function main(){
    try {
        const f = await init();
        while (true)
        {
            try {
                await importFromConsole(f.ds, f.openEditor);
            } catch (error) {
                throw error;
            }
        }
    } catch (error) {
        throw error;
    }
}
main().catch(error => console.error(error));
