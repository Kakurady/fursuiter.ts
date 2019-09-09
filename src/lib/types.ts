export type SiteName =
    "da" |
    "fa" |
    "facebook" |
    "flickr" |
    "furrynetwork" |
    "inkbunny" |
    "instagram" |
    "instagram_url" |
    "ko-fi" |
    "livejournal" |
    "patreon" |
    "second_life" |
    "second_life_uuid" |
    "sofurry" |
    "telegram" |
    "tumblr" |
    "twitter" |
    "weasyl" |
    "web" |
    "youtube";

export interface Contactable {
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

export interface DataSource {
    loadCharacter(name: string): Promise<Character | null>,
    loadPerformer(name: string): Promise<Performer | null>,
    loadMaker(name: string): Promise<MakerRecord | string>,
    loadSpecies(name: string): Promise<Species | string>,
    loadEvent(name: string): Promise<Event>,

    listAllCharacters(): Promise<string[]>
}