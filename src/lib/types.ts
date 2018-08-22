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

export interface Performer extends Contactable{

}

export interface Character extends Contactable{
    performer?: Character | Performer
}