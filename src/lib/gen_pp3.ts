import { SiteName, Contactable, Character, Maker, ProfileOptions } from "./types";
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
    var title;
    if (options.title) {
        title = options.title;
    } else {
        const names = options.characters.map(x => x.name);
        title = names.join(", ");
    }
    // TODO: add support for event titles
    // possibilities: have characters / no characters, have event / no event
    if (options.event) {
        if (title) {
            title = `${options.event.name} - ${title}`;
        } else {
            title = options.event.name;
        }
    }
    return title;
}

function gen_pp3(options: ProfileOptions) {
    const title = gen_title(options);

    const attributions = options.characters.map(gen_attributions);
    const description = attributions
        .join("\n")
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n");

    const tags = get_tags(options);

    var lines: string[] = [];

    lines.push("[Exif]");
    lines.push("Exif.MakerNote=#delete");
    if (options.artist) {
        lines.push(`Artist=${options.artist}`);
    }
    if (options.copyright) {
        lines.push(`Copyright=${options.copyright}`);
    }
    lines.push(`ImageDescription=#delete`);
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

    return { title, tags, description, text: lines.join("\n") };
}

export default gen_pp3;