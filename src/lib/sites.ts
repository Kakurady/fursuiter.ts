import { SiteName } from "./types";

type siteOps = {
    nameToSlug: (name: string) => string,
    toURLstr: (slug: string) => string
}

function parseMastodonAtName(input: string): string
{
    // format: [@]user@domain
    // user and domain may contain any character that is not @
    const re = /^@?([^@]+)@([^@]+)$/;
    const res = re.exec(input);
    if (!res){
        throw new Error("unable to parse Mastodon/Misskey username");
    }
    const user = res[1];
    const domain = res[2];
    return `https://${domain}/@${user}`;
}

const sites: { [k in SiteName]?: siteOps }
    = {
    "inkbunny": {
        nameToSlug: x => x, //fixme
        toURLstr: x => `https://inkbunny.net/${x}`
    },
    "weasyl": {
        nameToSlug: x => x.replace(/\. /g, "").toLowerCase(), 
        toURLstr: x => `https://www.weasyl.com/~${x}`
    },
    "twitter": {
        nameToSlug: x => x.replace(/^@/, ""),
        toURLstr: x => `https://twitter.com/${x}`
    },
    "da": {
        nameToSlug: x => x, //fixme
        toURLstr: x => `https://${x}.deviantart.com/`
    },
    "fa": {
        nameToSlug: x => x.replace(/_/g, ""),
        toURLstr: x => `https://www.furaffinity.net/user/${x}`
    },
    mastodon: {
        nameToSlug: x => x,
        toURLstr: parseMastodonAtName
    },
    misskey: {
        nameToSlug: x => x,
        toURLstr: parseMastodonAtName
    },
    tumblr: {
        nameToSlug: x => x,
        toURLstr: x => `https://${x}.tumblr.com/`,
    },
    instagram: {
        nameToSlug: x => x,
        toURLstr: x => `https://www.instagram.com/${x}/`,
    },
    facebook: {
        nameToSlug: x => x.replace(/ /g, ".").toLowerCase(),
        toURLstr: name => `https://www.facebook.com/${name}/`,
    },
    second_life: {
        // fixme Kakurady Resident -> kakurady
        nameToSlug: x => x.replace(/ /g, ".").toLowerCase(),
        toURLstr: x=> `https://my.secondlife.com/${x}`,
    },
    flickr: {
        nameToSlug: x => x,
        toURLstr: x => `https://www.flickr.com/people/${x}/`,
    },
    web: {
        nameToSlug: x => x,
        toURLstr: x => x
    }
};
export { sites };