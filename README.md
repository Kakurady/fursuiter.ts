Building
--------
- Install TypeScript globally
- run `tsc`
- Output will be in `dist/`.

Todo
----
- split files into browser-size & node-side
- enforce checks for undefined before use (src/lib/gen_pp3.ts:gen_title)
- figure out if repeating name of event in tags makes sense
- `loadSpecies()` can return a `Species` or a `string`. `gen_pp3` is fine either way, but maybe this could be tightened.
