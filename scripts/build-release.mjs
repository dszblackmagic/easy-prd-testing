#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

const PACKAGE_SCHEMA_VERSION = 1;
const UPDATE_SCHEMA_VERSION = 1;
const PACKAGE_ROOT = 'easy-prd-testing';
const PACKAGE_MANIFEST = '.easy-prd-testing-manifest.json';
const REPOSITORY = 'dszblackmagic/easy-prd-testing';

function fail(message) {
    throw new Error(message);
}

function sha256(data) {
    return createHash('sha256').update(data).digest('hex');
}

function normalizeVersion(value) {
    const version = String(value ?? '').replace(/^v/, '');
    if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
        fail(`Invalid stable semantic version: ${value}`);
    }
    return version;
}

function parseArguments(argv) {
    const [command = 'package', ...rest] = argv;
    const options = { command, root: process.cwd(), outputDir: null };
    for (let index = 0; index < rest.length; index += 1) {
        const arg = rest[index];
        if (arg === '--root') options.root = rest[++index];
        else if (arg === '--output-dir') options.outputDir = rest[++index];
        else if (arg === '--tag') options.tag = rest[++index];
        else if (arg === '--metadata') options.metadata = rest[++index];
        else if (arg === '--asset-digest') options.assetDigest = rest[++index];
        else if (arg === '--asset-size') options.assetSize = Number(rest[++index]);
        else if (arg === '--include-untracked') options.includeUntracked = true;
        else fail(`Unknown argument: ${arg}`);
    }
    return options;
}

function releaseFiles(root, includeUntracked = false) {
    const args = ['-C', root, 'ls-files', '--cached'];
    if (includeUntracked) args.push('--others', '--exclude-standard');
    args.push('-z');
    const output = execFileSync(
        'git',
        args,
        { encoding: 'buffer' },
    );
    return output
        .toString('utf8')
        .split('\0')
        .filter(Boolean)
        .filter((path) => path !== PACKAGE_MANIFEST)
        .sort((a, b) => a.localeCompare(b, 'en'));
}

function trackedFileModes(root) {
    const output = execFileSync(
        'git',
        ['-C', root, 'ls-files', '--stage', '-z'],
        { encoding: 'buffer' },
    );
    const modes = new Map();
    for (const entry of output.toString('utf8').split('\0').filter(Boolean)) {
        const separator = entry.indexOf('\t');
        if (separator === -1) fail(`Cannot parse Git index entry: ${entry}`);
        const [mode, , stage] = entry.slice(0, separator).split(' ');
        if (stage !== '0') fail('Cannot build a release while the Git index contains conflicts.');
        if (mode !== '100644' && mode !== '100755') {
            fail(`Release entries must be regular Git files: ${entry.slice(separator + 1)}`);
        }
        modes.set(entry.slice(separator + 1), mode === '100755' ? 0o755 : 0o644);
    }
    return modes;
}

function parseHighlights(markdown) {
    const lines = markdown.split(/\r?\n/);
    const headingIndex = lines.findIndex((line) => line.trim() === '## 更新亮点');
    if (headingIndex === -1) fail('Release notes must contain a "## 更新亮点" section.');
    const highlights = [];
    for (const line of lines.slice(headingIndex + 1)) {
        if (/^##\s+/.test(line)) break;
        const match = line.match(/^\s*-\s+(.+?)\s*$/);
        if (match) highlights.push(match[1]);
    }
    if (highlights.length < 3 || highlights.length > 5) {
        fail('The "## 更新亮点" section must contain 3 to 5 bullet items.');
    }
    return highlights;
}

function writeString(header, value, offset, length) {
    const data = Buffer.from(value, 'utf8');
    if (data.length > length) fail(`Tar header field is too long: ${value}`);
    data.copy(header, offset);
}

function writeOctal(header, value, offset, length) {
    const encoded = Math.max(0, value).toString(8).padStart(length - 1, '0');
    if (encoded.length > length - 1) fail(`Tar numeric field is too large: ${value}`);
    writeString(header, `${encoded}\0`, offset, length);
}

function splitUstarPath(path) {
    if (Buffer.byteLength(path) <= 100) return { name: path, prefix: '' };
    const parts = path.split('/');
    for (let index = parts.length - 1; index > 0; index -= 1) {
        const prefix = parts.slice(0, index).join('/');
        const name = parts.slice(index).join('/');
        if (Buffer.byteLength(prefix) <= 155 && Buffer.byteLength(name) <= 100) {
            return { name, prefix };
        }
    }
    fail(`Path cannot be represented in a ustar archive: ${path}`);
}

function tarHeader(path, size, mode) {
    const header = Buffer.alloc(512, 0);
    const { name, prefix } = splitUstarPath(path);
    writeString(header, name, 0, 100);
    writeOctal(header, mode, 100, 8);
    writeOctal(header, 0, 108, 8);
    writeOctal(header, 0, 116, 8);
    writeOctal(header, size, 124, 12);
    writeOctal(header, 0, 136, 12);
    header.fill(0x20, 148, 156);
    header[156] = '0'.charCodeAt(0);
    writeString(header, 'ustar\0', 257, 6);
    writeString(header, '00', 263, 2);
    writeString(header, 'easy-prd-testing', 265, 32);
    writeString(header, 'easy-prd-testing', 297, 32);
    if (prefix) writeString(header, prefix, 345, 155);
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    const checksumText = checksum.toString(8).padStart(6, '0');
    writeString(header, `${checksumText}\0 `, 148, 8);
    return header;
}

function createTar(files) {
    const chunks = [];
    for (const file of files) {
        chunks.push(tarHeader(file.path, file.data.length, file.mode));
        chunks.push(file.data);
        const padding = (512 - (file.data.length % 512)) % 512;
        if (padding) chunks.push(Buffer.alloc(padding));
    }
    chunks.push(Buffer.alloc(1024));
    return Buffer.concat(chunks);
}

async function readPluginVersion(root) {
    const plugin = JSON.parse(await readFile(join(root, '.codex-plugin', 'plugin.json'), 'utf8'));
    return normalizeVersion(plugin.version);
}

async function collectPackageFiles(root, version, includeUntracked) {
    const paths = releaseFiles(root, includeUntracked);
    const indexModes = trackedFileModes(root);
    const files = [];
    const managedFiles = [];
    for (const path of paths) {
        const absolutePath = join(root, path);
        const fileStat = await lstat(absolutePath);
        if (!fileStat.isFile()) fail(`Release entries must be regular files: ${path}`);
        const data = await readFile(absolutePath);
        const mode = indexModes.get(path) ?? (fileStat.mode & 0o111 ? 0o755 : 0o644);
        files.push({ path: `${PACKAGE_ROOT}/${path}`, data, mode });
        managedFiles.push({ path, digest: `sha256:${sha256(data)}`, mode: mode === 0o755 ? '755' : '644' });
    }
    const packageManifest = {
        schemaVersion: PACKAGE_SCHEMA_VERSION,
        version,
        rootDirectory: PACKAGE_ROOT,
        files: managedFiles,
    };
    const manifestText = `${JSON.stringify(packageManifest, null, 2)}\n`;
    return { files, packageManifest, manifestText };
}

async function versionAndTag(root, requestedTag) {
    const version = await readPluginVersion(root);
    const tag = requestedTag ?? `v${version}`;
    if (tag !== `v${version}`) fail(`Tag ${tag} does not match plugin version v${version}.`);
    return { version, tag };
}

export async function writeInstallManifest(options) {
    const root = resolve(options.root);
    const { version, tag } = await versionAndTag(root, options.tag);
    const collected = await collectPackageFiles(root, version, options.includeUntracked === true);
    const manifestPath = join(root, PACKAGE_MANIFEST);
    await writeFile(manifestPath, collected.manifestText);
    return { manifestPath, version, tag, fileCount: collected.packageManifest.files.length };
}

export async function verifyInstallManifest(options) {
    const root = resolve(options.root);
    const { version, tag } = await versionAndTag(root, options.tag);
    const collected = await collectPackageFiles(root, version, options.includeUntracked === true);
    const manifestPath = join(root, PACKAGE_MANIFEST);
    const actual = await readFile(manifestPath, 'utf8').catch(() => fail(`Missing ${PACKAGE_MANIFEST}.`));
    if (actual !== collected.manifestText) {
        fail(`${PACKAGE_MANIFEST} is stale. Regenerate it before publishing.`);
    }
    return { manifestPath, version, tag, fileCount: collected.packageManifest.files.length };
}

export async function buildReleasePackage(options) {
    const root = resolve(options.root);
    const outputDir = resolve(options.outputDir);
    const { version, tag } = await versionAndTag(root, options.tag);

    const notesPath = join(root, 'docs', 'releases', `${tag}.md`);
    const notes = await readFile(notesPath, 'utf8').catch(() => {
        fail(`Missing release notes: docs/releases/${tag}.md`);
    });
    const highlights = parseHighlights(notes);
    const collected = await collectPackageFiles(root, version, options.includeUntracked === true);
    const committedManifest = await readFile(join(root, PACKAGE_MANIFEST), 'utf8').catch(() => {
        fail(`Missing ${PACKAGE_MANIFEST}.`);
    });
    if (committedManifest !== collected.manifestText) {
        fail(`${PACKAGE_MANIFEST} is stale. Regenerate it before building a release.`);
    }
    const files = collected.files;
    const packageManifestData = Buffer.from(committedManifest);
    files.push({
        path: `${PACKAGE_ROOT}/${PACKAGE_MANIFEST}`,
        data: packageManifestData,
        mode: 0o644,
    });
    files.sort((a, b) => a.path.localeCompare(b.path, 'en'));

    const archive = gzipSync(createTar(files), { level: 9, mtime: 0 });
    const assetName = `easy-prd-testing-${tag}.tar.gz`;
    const assetPath = join(outputDir, assetName);
    const metadataPath = join(outputDir, 'release-metadata.json');
    const digest = `sha256:${sha256(archive)}`;
    const metadata = {
        version,
        tag,
        assetName,
        assetPath: basename(assetPath),
        assetSize: archive.length,
        localDigest: digest,
        releaseNotesPath: `docs/releases/${tag}.md`,
        releaseNotesUrl: `https://github.com/${REPOSITORY}/releases/tag/${tag}`,
        highlights,
    };

    await mkdir(outputDir, { recursive: true });
    await writeFile(assetPath, archive);
    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
    return { assetPath, metadataPath, metadata, packageManifest: collected.packageManifest };
}

export async function buildLatestManifest(options) {
    const outputDir = resolve(options.outputDir);
    const metadata = JSON.parse(await readFile(resolve(options.metadata), 'utf8'));
    const version = normalizeVersion(metadata.version);
    const digest = options.assetDigest ?? metadata.localDigest;
    if (!/^sha256:[a-f0-9]{64}$/.test(digest)) fail(`Invalid GitHub asset digest: ${digest}`);
    const size = options.assetSize ?? metadata.assetSize;
    if (!Number.isSafeInteger(size) || size < 0) fail(`Invalid GitHub asset size: ${size}`);

    const manifest = {
        schemaVersion: UPDATE_SCHEMA_VERSION,
        version,
        channel: 'stable',
        minimumUpdaterVersion: '0.1.2',
        minimumNodeVersion: '18.0.0',
        requiresManualMigration: false,
        asset: {
            name: metadata.assetName,
            size,
            digest,
            downloadUrl: `https://github.com/${REPOSITORY}/releases/download/${metadata.tag}/${metadata.assetName}`,
        },
        releaseNotesUrl: metadata.releaseNotesUrl,
        highlights: metadata.highlights,
    };
    const outputPath = join(outputDir, 'latest.json');
    await mkdir(outputDir, { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
    return { outputPath, manifest };
}

async function main() {
    const options = parseArguments(process.argv.slice(2));
    if (options.command === 'install-manifest') {
        if (!options.tag) fail('install-manifest requires --tag <vX.Y.Z>.');
        const result = await writeInstallManifest(options);
        process.stdout.write(`${JSON.stringify(result)}\n`);
        return;
    }
    if (options.command === 'verify-manifest') {
        if (!options.tag) fail('verify-manifest requires --tag <vX.Y.Z>.');
        const result = await verifyInstallManifest(options);
        process.stdout.write(`${JSON.stringify(result)}\n`);
        return;
    }
    if (!options.outputDir) fail('--output-dir is required.');
    if (options.command === 'package') {
        if (!options.tag) fail('package requires --tag <vX.Y.Z>.');
        const result = await buildReleasePackage(options);
        process.stdout.write(`${JSON.stringify(result.metadata)}\n`);
        return;
    }
    if (options.command === 'manifest') {
        if (!options.metadata) fail('manifest requires --metadata <path>.');
        const result = await buildLatestManifest(options);
        process.stdout.write(`${JSON.stringify(result.manifest)}\n`);
        return;
    }
    fail(`Unknown command: ${options.command}`);
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectRun) {
    main().catch((error) => {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
    });
}
