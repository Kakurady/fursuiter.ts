export type SiteName =
    "bsky" |
    "cohost" |
    "da" |
    "discord" |
    "fa" |
    "facebook" |
    "flickr" |
    "furrynetwork" |
    "inkbunny" |
    "instagram" |
    "instagram_url" |
    "ko-fi" |
    "livejournal" |
    "mastodon" |
    "misskey" |
    "patreon" |
    "second_life" |
    "second_life_uuid" |
    "sofurry" |
    "telegram" |
    "threads" |
    "tiktok" |
    "tumblr" |
    "twitch" |
    "twitter" |
    "weasyl" |
    "web" |
    "youtube";

export interface Contactable {
    key?: string,
    name?: string,
    on?: { [K in SiteName]?: string },
    abbr?: SiteName[],
    stale?: SiteName[],
};

export interface Performer extends Contactable {

}

// maker and performer can be fully formed structures, a reference to one, or freeform string.
export interface Character extends Contactable {
    gender?: "male" | "female" | string,
    maker?: Array<string | Maker>,
    performer?: Character | Performer,
    species?: Array<string | Species>,
    tags?: string[],
}
export type CharacterRecord = {
    [K in keyof Character]: K extends "performer" ? string | Character[K] : Character[K]
}

// "is" must refer to an actual Character/Maker/Performer.
export interface Maker extends Contactable {
    tags?: string[],
    is?: Contactable
}
// however, it's allowed to include a whole Character/Performer object in JSON
export type MakerRecord = {
    [K in keyof Maker]: K extends "is"? string | Maker[K] : Maker[K]
}

export interface Species {
    name?: string,
    tags?: string[],
}

// FIXME: collides with DOM "Event" API
export interface Event {
    tags?: string[],
    name?: string,
    country?: string,
    province?: string,
    city?: string,
}

export interface ProfileOptions {
    artist?: string,
    characters?: Character[],
    copyright?: string,
    event?: Event,
    label?: string,
    tags?: string[],
    title?: string,
}
export type ProfileOptionsRecord = {
    [K in keyof ProfileOptions]: K extends "event"? string | ProfileOptions[K] : ProfileOptions[K]
}

export type changeCallbackFuncType = ((eventType: "rename" | "change", filename: string | Buffer) => void) | undefined;

export interface DataSource {
    loadCharacter(name: string): Promise<Character | null>,
    loadPerformer(name: string): Promise<Performer | null>,
    loadMaker(name: string): Promise<MakerRecord | string>,
    loadSpecies(name: string): Promise<Species | string>,
    loadEvent(name: string): Promise<Event>,

    listall(type: "fursuit" | "event" | "maker" | "performer" | "species"): Promise<string[]>,
    listAllCharacters(): Promise<string[]>,

    /**
     * watch for data source changes.
     *
     * implementation note: this calls fs.watch() each time it's called. ok for now because this is only called once.
     * should be fixed before we support multiple callbacks.
     * @param callback
     */
    watchChanges(callback: changeCallbackFuncType): void,

    saveCharacter(name: string, data: CharacterRecord): Promise<void>

    savePerformer(name: string, data: Performer): Promise<void>

}

export type Strstrobj = {
    [key: string]: string
}