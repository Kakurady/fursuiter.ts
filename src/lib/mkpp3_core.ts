import FileSystemDataSource from "./FileSystemDataSource";
import {join as pathjoin, dirname} from "path";
import { DataSource, Performer, Character, CharacterRecord, Event, Maker, MakerRecord, SiteName, Species, ProfileOptionsRecord } from "./types";
import gen_pp3 from "./gen_pp3";
import { write } from "fs";
import write_pp3 from "./write_pp3";



function resolvePerformer(ds: DataSource, performer: string | Performer): Promise<Performer>{
    if (typeof performer === "string"){
        return ds.loadPerformer(performer) || ds.loadCharacter(performer);
    } else {
        return new Promise((resolve) => { resolve(performer) });
    }
}

// We don't actually care if the maker has a personal identity separate from their professional one.
// in fact, it's better if we don't load the maker as a Contactable,
// lest we end up with circular references.
async function resolveMaker (ds: DataSource, maker: string | Maker | MakerRecord) : Promise<Maker|string>{
    const loaded = (typeof maker === "string") ? await ds.loadMaker(maker) : maker;
    if (typeof loaded === "string"){
        return loaded;
    } else {
        const {name, abbr, stale, on, tags} = loaded;
        return {name, abbr, stale, on, tags};
    }
}

async function resolveMakers(ds: DataSource, maker?: string | Maker | Array<string | Maker>): Promise<Array<string | Maker>>{
    if (!maker) {
        return;
    }
    else if (maker instanceof Array){
        return Promise.all(maker.map (x=> resolveMaker(ds, x)));
    } else if (typeof maker === "string") {
        return [await resolveMaker(ds, maker)];
    } else {
        return [maker];
    }
}

async function resolveOneSpecies (ds:DataSource, species: string | Species): Promise<Species | string> {
    return (typeof species === 'string')? await ds.loadSpecies(species) : species;
}

async function resolveSpecies(ds: DataSource, species?: string | Species | Array<string | Species>): Promise<Array<string | Species>>{
    if (!species) {
        return;
    }
    else if (species instanceof Array){
        return Promise.all(species.map (x=> resolveOneSpecies(ds, x)));
    } else if (typeof species === "string") {
        return [await resolveOneSpecies(ds, species)];
    } else {
        return [species];
    }
}

type CharacterOptions = {
    key?: string, 
    id?: string, 
    addTags?: string[],
}
type characterKeyOrObject = string | (CharacterRecord & CharacterOptions);
async function resolveCharacter(ds: DataSource, character_key_or_object: characterKeyOrObject): Promise<Character | null>{
    if (!character_key_or_object) {return null;}

    // `character` can be a key (indicating we want the data as-is)
    // or an object with some values; these values will override
    // what's loaded from disk
    const filename = (typeof character_key_or_object === "string")? character_key_or_object : character_key_or_object.key || character_key_or_object.id;
    const options = (typeof character_key_or_object === "string")? {} : character_key_or_object; // to satisify typescript, that options is not a string
    const record: CharacterRecord = await ds.loadCharacter(filename) || {name: filename};
    const is_fursuit = true;

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
            originalPerformer = await resolvePerformer(ds, record.performer);
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
    const performer: Character | Performer = await resolvePerformer(ds, options.performer || record.performer);
    const species = await resolveSpecies(ds, options.species || record.species);
    const tags = [... (options.tags || record.tags || []), ...(options.addTags || [])];
    if (is_fursuit) {tags.push("fursuit")};

    return {name, on, abbr, stale, gender, maker, performer, species, tags};
}

async function readConfig() {
    let filename = pathjoin(dirname(process.argv[1]), "..", "config.json");

    return {dataPath: 'dummy', profilePath: "foo"};
}
async function init() {
    let config = await readConfig();
    let ds:DataSource = new FileSystemDataSource(config.dataPath);

    return function _c(ds: DataSource, profilePath: string) {
        async function _conv(characters: Array<characterKeyOrObject>, event_name: string, options: ProfileOptionsRecord) {
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
            const _options = {resolvedCharacters, ...options, event};

            return gen_pp3(_options);
        }
        
        function conv(characters: characterKeyOrObject | Array<characterKeyOrObject>, event_name?: string|ProfileOptionsRecord, options?: ProfileOptionsRecord){
            const _characters = (characters instanceof Array)? characters : [characters];
            const _event_name: string = (typeof event_name === 'string')? event_name: null;
            const _options = options || (typeof event_name === 'string')? {} : event_name;

            return _conv(_characters, _event_name, _options);
        }

        async function convAndWrite(characters: characterKeyOrObject | Array<characterKeyOrObject>, event_name?: string|ProfileOptionsRecord, options?: ProfileOptionsRecord){
            try {
                function extractEventName(): string{
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
                    if (!event_name) {
                        return extractEventNameFromProfileOptions(options);
                    }
                    if (typeof event_name === 'string'){
                        return event_name;
                    }
                    return extractEventNameFromProfileOptions(event_name);
                }
                const _event_name: string = extractEventName();
    
                const pp3 = await conv(characters, event_name, options);
                return await write_pp3(profilePath, pp3.filename, _event_name, pp3.text);
            } catch (error) {
                throw error;
            }
        }
        return { conv, resolveCharacter, convAndWrite };
    }(ds, config.profilePath);
}

export { init };