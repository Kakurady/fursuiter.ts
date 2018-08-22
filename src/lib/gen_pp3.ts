import { SiteName, Contactable, Character, Maker } from "./types";
import { sites } from "./sites";

function get_url_for_desc(someone: Contactable): string | undefined {
    const stale = new Set(someone.stale);

    const site_list: SiteName[] = [
        "web",
        "inkbunny",
        "weasyl",
        "twitter",
        "da",
        "fa",
        // "patreon",
        // "ko-fi",
        "tumblr",
        "youtube",
        "instagram",
        "facebook",
        "second_life",
        "second_life_uuid",
    ];
    for (const site of site_list) {
        if (someone.on[site] && !stale.has(site)) {
            const slug = sites[site].nameToSlug(someone.on[site]);
            const url = sites[site].toURLstr(slug);
            return url;
        }
    }
}

function gen_attributions(character: Character): string {
    function get_credit_for_desc(someone: Contactable | string): string {
        if (typeof someone === "string"){
            return someone;
        }

        const url = get_url_for_desc(someone);
        
        if (url){
            return someone.name ? `${someone.name} ( ${url} )` : url;
        } else {
            return (someone.name);
        }
    }

    const character_credit = get_credit_for_desc(character);
    if (character.performer){
        const performer_credit = get_credit_for_desc(character.performer);
        return `${performer_credit} as ${character_credit}`;
    } else {
        return character_credit;
    }
}

function* get_maker_tags(maker: Maker | string): Iterator<string>{
    if (typeof maker === "string"){
        yield maker;
        return;
    }
    if(!maker){ return; }
    if (maker.name || maker.tags){
        if (maker.name) { yield maker.name; }
        if (maker.tags) {
            for (const tag of maker.tags){
                yield tag;
            }
        }
    } else {
        return;
    }
}