import { join as pathjoin } from "path";
import { open, mkdir, rename, writeFile, close } from "fs";
import { promisify } from "util";
const openAsync = promisify(open);
const mkdirAsync = promisify(mkdir);
const renameAsync = promisify(rename);
const writeFileAsync = promisify(writeFile);
const closeAsync = promisify(close);


async function create_subfolders(base: string, ...paths: string[]) {
    let length = paths.length;
    let success = false;
    while (!success && length > 0) {
        try {
            // try to create directory "base + path[0, length)"
            let dirname = pathjoin(base, ...(paths.slice(0, length)));
            await mkdirAsync(dirname);
            success = true;
        } catch (e) {
            if (e.code == "ENOENT") {
                // rrr! no parent directory
                if (length > 1) {
                    // back off one level and try again
                    length--;
                } else {
                    // already at "base + path [0, 1)",
                    // giving up because if "base" exists, we shouldn't get this error
                    throw e;
                }
            } else {
                // some other kinds of error happened when trying to create directory.
                throw e;
            }
        }
    }
    // recursively create subdirectories. 
    // "base + path[0, length)" should exist now, so add 1 to length
    for (length++; length <= paths.length; length++) {
        let dirname = pathjoin(base, ...paths.slice(0, length));
        await mkdirAsync(dirname);
    }
}

/**
 * 
 * @param {string} filename 
 * @param {string} event_name 
 * @param {string} text 
 * @param {boolean?} overwrite 
 */
export default async function write_pp3(profilePath: string, filename: string, event_name: string, text: string, overwrite?: boolean) {
    const paths = (event_name) ? ["events", event_name] : ["characters"];

    const full_path = pathjoin(profilePath, ...paths, `${filename}.pp3`);

    // try to open a file handle
    var subdir_created = false;
    var backup_copied = false;
    var success = false;
    var fd: number;
    while (!success) {
        try {
            fd = await openAsync(full_path, "wx");
            success = true;

        } catch (e) {
            if (e.code == "ENOENT" && !subdir_created) {
                // can't find ancestor folders, have to create them
                try {
                    await create_subfolders(profilePath, ...paths);
                    subdir_created = true;
                } catch (e) {
                    throw e;
                }

            } else if (e.code == "EEXIST" && !backup_copied && overwrite !== false) {
                // there's already an existing file, need to move it
                let backup_path = pathjoin(profilePath, ...paths, `${filename}.pp3~`);
                // on Linux, renames overwrite existing files, so don't have to test for it
                await renameAsync(full_path, backup_path);
                backup_copied = true;

            } else {
                // something else went wrong.
                throw e;
            }
        }
    }

    await writeFileAsync(fd, text);
    await closeAsync(fd);
}
