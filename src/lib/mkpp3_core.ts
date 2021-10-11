import FileSystemDataSource from "./FileSystemDataSource";
import {join as pathjoin, dirname} from "path";
import { DataSource, Performer, Character, CharacterRecord, Event, Maker, MakerRecord, SiteName, Species, ProfileOptionsRecord } from "./types";
import gen_pp3 from "./gen_pp3";
import { readFile } from "fs";
import write_pp3 from "./write_pp3";
import { promisify } from "util";



async function resolvePerformer(ds: DataSource, performer: string | Performer): Promise<Performer>{
    if (typeof performer === "string"){
        return await ds.loadPerformer(performer) || await ds.loadCharacter(performer);
    } else {
        return performer;
    }
}

// We don't actually care if the maker has a personal identity separate from their professional one.
// in fact, it's better if we don't load the maker as a Contactable,
// lest we end up with circular references.
async function resolveMaker (ds: DataSource, maker: string | Maker | MakerRecord) : Promise<Maker|string>{
    try {
        const loaded = (typeof maker === "string") ? await ds.loadMaker(maker) : maker;
        if (typeof loaded === "string"){
            return loaded;
        } else {
            const {name, abbr, stale, on, tags} = loaded;
            return {name, abbr, stale, on, tags};
        }
    } catch (error) {
        throw error;
    }

}

async function resolveMakers(ds: DataSource, maker?: string | Maker | Array<string | Maker>): Promise<Array<string | Maker>>{
    if (!maker) {
        return [];
    }
    try {
        if (maker instanceof Array){
            return Promise.all(maker.map (x=> resolveMaker(ds, x)));
        } else if (typeof maker === "string") {
            return [await resolveMaker(ds, maker)];
        } else {
            return [maker];
        }        
    } catch (error) {
        throw error;
    }

}

async function resolveOneSpecies (ds:DataSource, species: string | Species): Promise<Species | string> {
    try {
        return (typeof species === 'string')? await ds.loadSpecies(species) : species;
    } catch (error) {
        throw error;        
    }
}

async function resolveSpecies(ds: DataSource, species?: string | Species | Array<string | Species>): Promise<Array<string | Species>>{
    if (!species) {
        return [];
    }
    try {
        if (species instanceof Array){
            return Promise.all(species.map (x=> resolveOneSpecies(ds, x)));
        } else if (typeof species === "string") {
            return [await resolveOneSpecies(ds, species)];
        } else {
            return [species];
        }
    } catch (error) {
        throw error;
    }
}

type CharacterOptions = {
    key?: string, 
    id?: string, 
    addTags?: string[],
}
type characterKeyOrObject = string | (CharacterRecord & CharacterOptions);
async function resolveCharacter(ds: DataSource, character_key_or_object: characterKeyOrObject): Promise<Character | null>{
    try {
        if (!character_key_or_object) {return null;}

        // `character` can be a key (indicating we want the data as-is)
        // or an object with some values; these values will override
        // what's loaded from disk
        const filename = (typeof character_key_or_object === "string")? character_key_or_object : character_key_or_object.key || character_key_or_object.id;
        const options = (typeof character_key_or_object === "string")? {} : character_key_or_object; // to satisify typescript, that options is not a string
        let is_fursuit = false;
        const record: CharacterRecord = await (async () => {
            if (!filename){
                if (options.name){
                    console.info(`not loading data for ${options.name} - to specify a file to load, use the key or id attribute`);
                } else {
                    console.info("key or id attribute missing! using the options object as character info");
                }
                return {};
            }
            const ret = await ds.loadCharacter(filename);
            if (ret) {
                is_fursuit = true; return ret;
            }
            const ret2 = await ds.loadPerformer(filename);
            if (ret2) {
                return ret2;
            }
            const ret3 = await ds.loadMaker(filename);
            if (ret3 && typeof ret3 !== "string"){
                return ret3;
            }
            console.warn(`cannot load ${filename}`);
            return { name: `${filename} NOT FOUND` };
        })();

        // to decide character and performer's contact info, we look at
    // if there's a performer override. 
        let originalPerformer : Character | Performer | undefined;
        if (options.performer){
            // if there is one, we will overwrite the original performer's info
            // with the overriding performer, leaving us with the character's 
            // info and the overriding performer's.
            if (!record.on && record.performer){
                // However, if the character has no contact info, 
                // we have to fall back to the original performer's info.
                originalPerformer = await (async () => {
                    let ret = await resolvePerformer(ds, record.performer);
                    if (!ret) {
                        console.warn(`${filename}'s original performer ${record.performer} not found`);
                    }
                    return ret;
                })();
            }
        }
        // assemble the character from parts.
        // Parts of Contactable: name, on, abbr, stale
        const name = options.name || record.name || filename;
        const on: { [K in SiteName]?: string } = 
                        options.on ||   originalPerformer && (originalPerformer.on || {})   ||  record.on;
        const abbr =    options.abbr || originalPerformer && (originalPerformer.abbr || []) ||  record.abbr;
        const stale =   options.stale || originalPerformer && (originalPerformer.stale || []) || record.stale;
        
        // Parts of Character: gender, maker, performer, species, tags
        const gender = options.gender || record.gender;
        const maker = await resolveMakers(ds, options.maker || record.maker);
        const performer: Character | Performer = await (async (performer) => {
            if (!performer){
                return null;
            }
            let ret = await resolvePerformer(ds, performer);
            if (!ret) {
                console.warn(`performer ${performer} not found`);
            }
            return ret;
        })(options.performer || record.performer);
        const species = await resolveSpecies(ds, options.species || record.species);
        const tags = [... (options.tags || record.tags || []), ...(options.addTags || [])];
        if (is_fursuit) {tags.push("fursuit")};
    
        return {name, on, abbr, stale, gender, maker, performer, species, tags};
    } catch (error) {
        throw error;
    }
}

async function readConfig() {
    try {
        const readFileAsync = promisify(readFile);

        const filename = pathjoin(dirname(process.argv[1]), "..", "config.json");
        const fileContents = await readFileAsync(filename, { encoding: "utf-8" });

        const config = JSON.parse(fileContents);
        let dataPath: string;
        let profilePath: string;
        ({dataPath, profilePath} = config);
        return {dataPath, profilePath};
    } catch (error) {
        throw error;
    }

}
async function init() {
    try {
        let config = await readConfig();
        let ds:DataSource = new FileSystemDataSource(config.dataPath);

        return function _c(ds: DataSource, profilePath: string) {
            async function _conv(characters: Array<characterKeyOrObject>, event_name: string, options: ProfileOptionsRecord) {
                try {
                    const resolvedCharacters = await Promise.all(characters.map(x=>resolveCharacter(ds, x)));
                    let event: Event;
                    if (options.event){
                        if (typeof options.event === 'string'){
                            event = await ds.loadEvent(options.event);
                        } else {
                            event = options.event;
                        }
                    } else if (event_name){
                        event = await ds.loadEvent(event_name);
                    }
                    const _options = {characters: resolvedCharacters, ...options, event};

                    let ret =  gen_pp3(_options);
                    return ret;
                } catch (error) {
                    throw error;
                }
            }
            function extractEventNameFromProfileOptions(o: ProfileOptionsRecord): string{
                if (!o){
                    return;
                }
                if (!o.event){
                    return;
                }
                if (typeof o.event === 'string'){
                    return o.event;
                }
                return o.event.name;
            }


            function conv(characters: characterKeyOrObject | Array<characterKeyOrObject>, event_name_or_options?: string|ProfileOptionsRecord, options?: ProfileOptionsRecord){
                const _characters = (Array.isArray(characters))? characters : [characters];
                const _event_name: string = (typeof event_name_or_options === 'string')? event_name_or_options: null;
                const _options = (() => {
                    if (options) { return options; }
                    if (typeof event_name_or_options === 'string') { return {}; }
                    if (event_name_or_options) { return event_name_or_options; }
                    return {};
                })();

                return _conv(_characters, _event_name, _options);
            }

            async function convAndWrite(characters: characterKeyOrObject | Array<characterKeyOrObject>, event_name?: string|ProfileOptionsRecord, options?: ProfileOptionsRecord){
                function extractEventName(): string{
                    if (!event_name) {
                        return extractEventNameFromProfileOptions(options);
                    }
                    if (typeof event_name === 'string'){
                        return event_name;
                    }
                    return extractEventNameFromProfileOptions(event_name);
                }
                try {
                    const _event_name: string = extractEventName();
        
                    const pp3 = await conv(characters, event_name, options);
                    console.log(pp3);
                    return await write_pp3(profilePath, pp3.filename, _event_name, pp3.text);
                } catch (error) {
                    throw error;
                }
            }

            /* query functions */
            async function readAllCharacters(){
                const characterList: string[] = await ds.listAllCharacters();
                return await Promise.all(characterList.map(key => resolveCharacter(ds, key)));
            }
            async function findAllSpeciesAndTags(){
                const maker_set: Set<string> = new Set();
                const species_set: Set<string> = new Set();
                const tags_set: Set<string> = new Set();

                const characters = await readAllCharacters();
                for (const character of characters) {
                    for (const m of (character.maker || [])) {
                        maker_set.add(typeof m === "string" ? m : m.name);
                    }
                    for (const s of (character.species || [])) {
                        species_set.add(typeof s === "string" ? s : s.name);
                    }
                    for (const t of (character.tags || [])) {
                        tags_set.add(t);
                    }
                }
                
                const makers = [...maker_set.values()].sort();
                const species = [...species_set.values()].sort();
                const tags = [...tags_set.values()].sort();

                return {makers, species, tags};
            }

            type ProfileScript = {
                label: string,
                characters: characterKeyOrObject[]
            }[];
            async function readProfileScript(filename: string): Promise<ProfileScript> {
                try {
                    const readFileAsync = promisify(readFile);
                    const fileContents = await readFileAsync(filename, { encoding: "utf-8" });
                    let lines = fileContents.split(/\n|\r\n/);
                    if (lines[lines.length - 1] == "") { 
                        lines.pop(); 
                    }
                    const profileList = lines.map(
                        /** @param line of the shape "label:character1,character2/performer,character3" */
                        line => {
                            if (line[0] == "#") { return; }
                            const labelEnd = line.indexOf(":");
                            const label = labelEnd >= 0 && line.slice(0, labelEnd) || "";
                            /** rest of the line, without label */
                            const noLabel = (labelEnd >= 0)? line.slice(labelEnd + 1) : line;
                            
                            const names = noLabel.split(",");
                            const characters = names.map(
                                /** @param name of the shape "character name", or "character name/performer name" */
                                name => {
                                    const [key, performer] = name.split("/");
                                    if (performer) {
                                        return { key, performer };
                                    } else {
                                        return key;
                                    }
                                });
                            return {label, characters};
                        });
                    return profileList.filter(x=>!!x);
                } catch (error) {
                    throw error;
                }
            }

            async function writeProfilesFromScript(profileScript:ProfileScript | PromiseLike<ProfileScript>, event_name: string, options:ProfileOptionsRecord){
                try {
                    const _profileScript = await profileScript;
                    const res = _profileScript.map(x=>convAndWrite(x.characters, event_name, {...options, label: x.label}));
                    await Promise.all(res);                    
                } catch (error) {
                    throw error;
                }

            }
            return { 
                ds, 
                readConfig, 
                conv, 
                resolveCharacter, 
                convAndWrite, 
                readProfileScript, 
                writeProfilesFromScript, 
                resolvePerformer,
                findAllSpeciesAndTags,
            };
        }(ds, config.profilePath);
    } catch (error) {
        throw error;
    }
}

export { init };