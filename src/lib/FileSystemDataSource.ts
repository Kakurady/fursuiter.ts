import { Event, Character, Performer, Species, MakerRecord, DataSource } from "./types";

import { readFile, readdir } from "fs";
import { promisify } from "util";
import { extname } from "path";

const readFileAsync = promisify(readFile);
const readdirAsync = promisify(readdir);

//TODO: Change file name to lower case for all other than loadMaker. Also validate names
export default class FileSystemDataSource implements DataSource {
    dataPath: string;

    /**
     *
     * @param dataPath
     */
    constructor(dataPath: string) {
        this.dataPath = dataPath;
    }


    async loadCharacter(name: string): Promise<Character | null> {
        try {
            const s = await readFileAsync(`${this.dataPath}/fursuit/${name}.json`, {
                encoding: "utf8"
            });
            const obj = JSON.parse(s);
            return obj;
        } catch (e) {
            if (e.code == "ENOENT") {
                return null;
            } else {
                throw e;
            }
        }
    }

    async loadPerformer(name: string): Promise<Performer | null> {
        try {
            const s = await readFileAsync(`${this.dataPath}/performer/${name}.json`, {
                encoding: "utf8"
            });
            const obj = JSON.parse(s);
            return obj;
        } catch (e) {
            if (e.code == "ENOENT") {
                return null;
            } else {
                throw e;
            }
        }
    }

    // FIXME can name input be trusted here?
    async loadMaker(name: string): Promise<MakerRecord | string> {
        try {
            // most makers don't have data, so just return as-is later,
            // but if data is later added it won't be found, so change to lowercase.
            //
            // hopefully I won't ever need toLocaleLowerCase() here.
            const filename = name.toLowerCase().replace(/ /g, "_");

            const s = await readFileAsync(`${this.dataPath}/maker/${filename}.json`, { 'encoding': 'utf8' });

            const obj = JSON.parse(s);
            return obj;
        } catch (e) {
            if (e.code == "ENOENT") {
                return name;
            } else {
                throw e;
            }
        }
    }

    async loadSpecies(name: string): Promise<Species | string> {
        try {
            const s = await readFileAsync(`${this.dataPath}/species/${name}.json`, {
                encoding: "utf8"
            });

            const obj = JSON.parse(s);
            return obj;
        } catch (e) {
            if (e.code == "ENOENT") {
                return name;
            } else {
                throw e;
            }
        }
    }

    async loadEvent(name: string): Promise<Event> {
        try {
            const s = await readFileAsync(`${this.dataPath}/event/${name}.json`, {
                encoding: "utf8"
            });
            const obj = JSON.parse(s);
            // type checking is not enforced here currently
            return obj;
        } catch (e) {
            if (e.code == "ENOENT") {
                // return a default event.
                // FIXME: most of the event files don't repeat the names in the tags - which type is appropriate?
                // also, this should probably be in a different area
                return { name, tags: [name] };
            } else {
                throw e;
            }
        }
    }

    async listall(type: "fursuit" | "event" | "maker" | "performer" | "species"): Promise<string[]>{
        try {
            const files = await readdirAsync(`${this.dataPath}/${type}/`);
            return files.filter(filename => extname(filename) == ".json").map(filename => filename.slice(0, -5));
        } catch (e) {
            throw e;
        }        
    }

    listAllCharacters(): Promise<string[]> {
        return this.listall("fursuit");
    }
}
