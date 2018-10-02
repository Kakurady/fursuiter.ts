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

export interface Character extends Contactable {
    gender?: "male" | "female" | string,
    maker?: Array<string | Maker>,
    performer?: Character | Performer,
    species?: Array<string | Species>,
    tags?: string[],
}
type CharacterRecord = {
    [K in keyof Character]: K extends "maker" | "performer" | "species" ? string : Character[K]
}

export interface Maker extends Contactable {
    tags?: string[],
    is?: Contactable
}
type MakerRecord = {
    [K in keyof Maker]: K extends "is"? string : Maker[K]
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
    tags?: string[],
    title?: string,
}
