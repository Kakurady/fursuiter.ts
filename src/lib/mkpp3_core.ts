import FileSystemDataSource from "./FileSystemDataSource";
import {join as pathjoin, dirname} from "path";
import { DataSource, Performer, Character, CharacterRecord, Maker, MakerRecord, SiteName, Species } from "./types";

// need closure because writeProfilesFromList uses map
function _closure(ds: FileSystemDataSource, profilePath: string) {
    function convAndWrite() {

    }

    return { convAndWrite };
}

function resolvePerformer(ds: DataSource, performer: string | Performer): Promise<Performer>{
    if (typeof performer === "string"){
        return ds.loadPerformer(performer) || ds.loadCharacter(performer);
    } else {
        return new Promise((resolve) => { resolve(performer) });
    }
}

type CharacterOptions = {
    key?: string, 
    id?: string, 
    addTags?: string[],
}

// We don't actually care if the maker has a personal identity separate from their professional one.
// in fact, it's better if we don't load the maker as a Contactable,
// lest we end up with circular references.
async function resolveMaker (ds: DataSource, maker: string | Maker | MakerRecord) : Promise<Maker|string>{
    const loaded = (typeof maker === "string") ? await ds.loadMaker(maker) : maker;
    if (typeof loaded === "string"){
        return loaded;
    } else{
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

async function resolveCharacter(ds: DataSource, character_key_or_object: string | (CharacterRecord & CharacterOptions)): Promise<Character | null>{
    if (!character_key_or_object) {return null;}

    // `character` can be a key (indicating we want the data as-is)
    // or an object with some values; these values will override
    // what's loaded from disk
    const filename = (typeof character_key_or_object === "string")? character_key_or_object : character_key_or_object.key || character_key_or_object.id;
    const options = (typeof character_key_or_object === "string")? {} : character_key_or_object; // to satisify typescript
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
}
async function init() {
    let config = await readConfig();

    return _closure(null, null);
}

export { init };