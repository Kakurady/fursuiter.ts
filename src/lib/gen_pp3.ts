import { SiteName, Contactable, Character, Maker, ProfileOptions } from "./types";
import { sites } from "./sites";

function get_url_for_desc(someone: Contactable): string | undefined {
    const stale = new Set(someone.stale || []);
    if (!someone.on){ return; }

    const site_list: SiteName[] = [
        "web",
        "mastodon",
        "misskey",
        "weasyl",
        "inkbunny",
        "flickr",
        "fa",
        // "patreon",
        // "ko-fi",
        "tumblr",
        "youtube",
        "instagram",
        "bsky",
        "da",
        "twitter",
        "facebook",
        "second_life",
        "second_life_uuid",
    ];
    for (const site of site_list) {
        if (someone.on[site] && !stale.has(site) && sites[site]) {
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

function* get_maker_tags(maker: Maker | string): Iterable<string> {
    if (typeof maker === "string") {
        yield maker;
        return;
    }
    if (!maker) { return; }
    if (maker.name || maker.tags) {
        if (maker.name) { yield maker.name; }
        if (maker.tags) {
            for (const tag of maker.tags) {
                yield tag;
            }
        }
    } else {
        return;
    }
}

function get_tags(options: ProfileOptions): string[] {
    function* iterate_over_all_tags(): Iterable<string> {
        if (options.tags) {
            for (const tag of options.tags) {
                yield tag;
            }
        }

        if (options.characters) {
            for (const character of options.characters) {
                for (const species of character.species) {
                    if (typeof species === "string") {
                        yield species;
                    } else {
                        if (species.tags) {
                            for (const tag of species.tags) {
                                yield tag;
                            }
                        }
                    }
                }
                for (const tag of character.tags) {
                    yield tag;
                }
                // should makers be added to tags? 
                // might be pushing to FA's 255-char or Flickr's 50-tag limit.
                for (const maker of character.maker) {
                    for (const tag of get_maker_tags(maker)) {
                        yield tag;
                    }
                }
            } // for character of options.characters
            if (options.characters.length == 1 && options.characters[0].gender) {
                yield options.characters[0].gender;
            }
        } // if (options.characters)

        if (options.event && options.event.tags) {
            for (const tag of options.event.tags) {
                yield tag;
            }
        }
    } // function*

    var tag_set = new Set(iterate_over_all_tags());
    tag_set.delete("");
    var tags = Array.from(tag_set);
    return tags;
}

function gen_title(options: ProfileOptions): string {
    // create the headline (title)
    var title:string;
    if (options.title) {
        title = options.title;
    } else {
        // FIXME: did not check characters is defined? Either check here or remove undefined from definition
        const names = options.characters.map(x => x.name).filter(x=>x);
        let [last, ...rest] = names.reverse();
        if (rest.length > 1) {
            title = `${rest.reverse().join(", ")}, and ${last}`;
        } else if (rest.length > 0) {
            title = `${rest[0]} and ${last}`;
        }
        else if (last) {
            title = last;
        }
    }
    // Add event name to the title
    // possibilities: have characters / no characters, have event / no event
    if (options.event) {
        if (title) {
            title = `${title} at ${options.event.name}`;
        } else {
            title = options.event.name;
        }
    }
    return title;
}

const punct = /[!-/:-@\[-`{-~]/g;
function gen_profile_filename(options: ProfileOptions): string{
    let working_title = options.characters ? options.characters.map(x=>x.key || x.name): [];
    if (options.label) {
        working_title.unshift(options.label);
    } else if (working_title.length == 0){
        working_title.push(options.event.name);
    }
    return working_title.map(x=>x.replace(punct, "_").toLowerCase()).join("_");
}

/**
 * Create processing profile text body from a set of options.
 * @param options 
 */
function gen_pp3(options: ProfileOptions) {
    const title = gen_title(options);
    const filename = gen_profile_filename(options);

    const attributions = options.characters.map(gen_attributions);
    const description = attributions
        .join("\n")
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n");

    const tags = get_tags(options);

    var lines: string[] = [];

    lines.push("[Exif]");
    if (options.artist) {
        lines.push(`Artist=${options.artist}`);
    }
    if (options.copyright) {
        lines.push(`Copyright=${options.copyright}`);
    }
    lines.push("");

    lines.push(`[IPTC]
Caption=${description};
Headline=${title};
Keywords=${tags.join(";")};`);

    if (options.artist) {
        lines.push(`Author=${options.artist}`);
    }
    if (options.copyright) {
        lines.push(`Copyright=${options.copyright}`);
    }
    if (options.event) {
        if (options.event.country) {
            lines.push(`Country=${options.event.country}`);
        }
        if (options.event.province) {
            lines.push(`Province=${options.event.province}`);
        }
        if (options.event.city) {
            lines.push(`City=${options.event.city}`);
        }
    }

    return { filename, title, tags, description, text: lines.join("\n") };
}

export default gen_pp3;