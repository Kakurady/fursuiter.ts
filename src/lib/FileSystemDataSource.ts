import { Event, Character, Performer, Species, MakerRecord } from "./types";

import { readFile } from "fs";
import { promisify } from "util";

const readFileAsync = promisify(readFile);

//TODO: Change file name to lower case for all other than loadMaker. Also validate names
export default class FileSystemDataSource {
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
}
