#!/usr/bin/env node

// Zero-dependency update engine for the complete Easy PRD Testing installation.

import { createHash } from 'node:crypto';
import {
    chmod,
    lstat,
    mkdir,
    mkdtemp,
    open,
    readFile,
    readdir,
    realpath,
    rename,
    rm,
    writeFile,
} from 'node:fs/promises';
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import {
    basename,
    dirname,
    join,
    posix,
    resolve,
    sep,
} from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

export const UPDATER_VERSION = '0.1.3';
export const UPDATE_SCHEMA_VERSION = 1;
export const PACKAGE_SCHEMA_VERSION = 1;
export const PACKAGE_ROOT = 'easy-prd-testing';
export const PACKAGE_MANIFEST = '.easy-prd-testing-manifest.json';
export const LATEST_MANIFEST_URL =
    'https://github.com/CoffeeCheese/easy-prd-testing/releases/latest/download/latest-v2.json';

const OFFICIAL_REPOSITORY = 'CoffeeCheese/easy-prd-testing';
// Keep the legacy repository trusted so v0.1.2 manifests and clones can migrate safely.
const LEGACY_REPOSITORY = 'dszblackmagic/easy-prd-testing';
const TRUSTED_REPOSITORIES = [OFFICIAL_REPOSITORY, LEGACY_REPOSITORY];
const LEGACY_LATEST_MANIFEST_URL =
    'https://github.com/dszblackmagic/easy-prd-testing/releases/latest/download/latest.json';
const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 100 * 1024 * 1024;
const MAX_EXTRACTED_FILES = 5000;
const LOCK_STALE_MS = 2 * 60 * 60 * 1000;

export class UpdateError extends Error {
    constructor(code, message, details = undefined) {
        super(message);
        this.name = 'UpdateError';
        this.code = code;
        this.details = details;
    }
}

function sha256(data) {
    return createHash('sha256').update(data).digest('hex');
}

async function sha256File(path) {
    return sha256(await readFile(path));
}

function normalizeVersion(value) {
    return String(value ?? '').replace(/^v/, '');
}

export function parseSemver(value) {
    const normalized = normalizeVersion(value);
    const match = normalized.match(
        /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?$/,
    );
    if (!match) {
        throw new UpdateError('invalid-version', `Invalid semantic version: ${value}`);
    }
    return {
        raw: normalized,
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
        prerelease: match[4] ?? null,
    };
}

export function compareSemver(left, right) {
    const a = parseSemver(left);
    const b = parseSemver(right);
    for (const key of ['major', 'minor', 'patch']) {
        if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1;
    }
    if (a.prerelease === b.prerelease) return 0;
    if (a.prerelease === null) return 1;
    if (b.prerelease === null) return -1;
    return a.prerelease.localeCompare(b.prerelease, 'en');
}

function assertObject(value, code, message) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new UpdateError(code, message);
    }
    return value;
}

function assertString(value, code, message) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new UpdateError(code, message);
    }
    return value;
}

function validateDigest(value) {
    if (typeof value !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(value)) {
        throw new UpdateError('invalid-manifest', 'Release asset digest must use sha256:<hex>.');
    }
    return value;
}

function expectedReleasePrefix(repository, version) {
    return `https://github.com/${repository}/releases/download/v${version}/`;
}

export function validateUpdateManifest(input, options = {}) {
    const manifest = assertObject(input, 'invalid-manifest', 'Update manifest must be an object.');
    if (manifest.schemaVersion !== UPDATE_SCHEMA_VERSION) {
        throw new UpdateError(
            'unsupported-manifest-schema',
            `Unsupported update manifest schema: ${manifest.schemaVersion}`,
        );
    }

    const version = parseSemver(manifest.version).raw;
    if (parseSemver(version).prerelease !== null || manifest.channel !== 'stable') {
        throw new UpdateError('unsupported-release-channel', 'Only stable releases can be installed.');
    }

    const minimumUpdaterVersion = parseSemver(manifest.minimumUpdaterVersion).raw;
    const minimumNodeVersion = parseSemver(manifest.minimumNodeVersion).raw;
    const asset = assertObject(
        manifest.asset,
        'invalid-manifest',
        'Update manifest is missing the release asset.',
    );
    const name = assertString(asset.name, 'invalid-manifest', 'Release asset name is missing.');
    const digest = validateDigest(asset.digest);
    const downloadUrl = assertString(
        asset.downloadUrl,
        'invalid-manifest',
        'Release asset download URL is missing.',
    );
    const expectedName = `easy-prd-testing-v${version}.tar.gz`;
    if (name !== expectedName) {
        throw new UpdateError('invalid-manifest', `Expected release asset ${expectedName}, received ${name}.`);
    }

    if (!options.allowTestUrls) {
        const trustedDownload = TRUSTED_REPOSITORIES.some(
            (repository) => downloadUrl === `${expectedReleasePrefix(repository, version)}${name}`,
        );
        if (!trustedDownload) {
            throw new UpdateError('untrusted-download-url', `Untrusted release asset URL: ${downloadUrl}`);
        }
    }

    const releaseNotesUrl = assertString(
        manifest.releaseNotesUrl,
        'invalid-manifest',
        'Release notes URL is missing.',
    );
    const trustedReleaseNotes = TRUSTED_REPOSITORIES.some(
        (repository) => releaseNotesUrl === `https://github.com/${repository}/releases/tag/v${version}`,
    );
    if (!options.allowTestUrls && !trustedReleaseNotes) {
        throw new UpdateError('untrusted-release-notes-url', `Untrusted release notes URL: ${releaseNotesUrl}`);
    }

    if (
        !Array.isArray(manifest.highlights) ||
        manifest.highlights.length < 3 ||
        manifest.highlights.length > 5 ||
        !manifest.highlights.every((item) => typeof item === 'string' && item.trim().length > 0)
    ) {
        throw new UpdateError('invalid-manifest', 'Update highlights must contain 3 to 5 non-empty items.');
    }

    return {
        schemaVersion: UPDATE_SCHEMA_VERSION,
        version,
        channel: 'stable',
        minimumUpdaterVersion,
        minimumNodeVersion,
        requiresManualMigration: manifest.requiresManualMigration === true,
        asset: {
            name,
            digest,
            downloadUrl,
            size: Number.isSafeInteger(asset.size) && asset.size >= 0 ? asset.size : null,
        },
        releaseNotesUrl,
        highlights: manifest.highlights.map((item) => item.trim()),
    };
}

function validatePackagePath(path) {
    if (typeof path !== 'string' || path.length === 0 || path.includes('\\')) {
        throw new UpdateError('invalid-package-manifest', `Invalid managed file path: ${path}`);
    }
    const normalizedPath = posix.normalize(path);
    if (
        posix.isAbsolute(path) ||
        normalizedPath === '..' ||
        normalizedPath.startsWith('../') ||
        normalizedPath !== path
    ) {
        throw new UpdateError('invalid-package-manifest', `Unsafe managed file path: ${path}`);
    }
    return path;
}

export function validatePackageManifest(input, expectedVersion = undefined) {
    const manifest = assertObject(
        input,
        'invalid-package-manifest',
        'Package manifest must be an object.',
    );
    if (manifest.schemaVersion !== PACKAGE_SCHEMA_VERSION) {
        throw new UpdateError(
            'unsupported-package-schema',
            `Unsupported package manifest schema: ${manifest.schemaVersion}`,
        );
    }
    const version = parseSemver(manifest.version).raw;
    if (expectedVersion && version !== normalizeVersion(expectedVersion)) {
        throw new UpdateError(
            'package-version-mismatch',
            `Package version ${version} does not match expected version ${expectedVersion}.`,
        );
    }
    if (manifest.rootDirectory !== PACKAGE_ROOT) {
        throw new UpdateError('invalid-package-manifest', 'Unexpected package root directory.');
    }
    if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
        throw new UpdateError('invalid-package-manifest', 'Package manifest has no managed files.');
    }

    const seen = new Set();
    const files = manifest.files.map((entry) => {
        assertObject(entry, 'invalid-package-manifest', 'Managed file entry must be an object.');
        const path = validatePackagePath(entry.path);
        if (path === PACKAGE_MANIFEST || seen.has(path)) {
            throw new UpdateError('invalid-package-manifest', `Duplicate or reserved managed path: ${path}`);
        }
        seen.add(path);
        return {
            path,
            digest: validateDigest(entry.digest),
            mode: entry.mode === '755' ? '755' : '644',
        };
    });

    return {
        schemaVersion: PACKAGE_SCHEMA_VERSION,
        version,
        rootDirectory: PACKAGE_ROOT,
        files,
    };
}

function requestBuffer(url, options, redirectCount = 0) {
    const {
        allowTestUrls = false,
        maxBytes,
        timeoutMs = 15000,
        allowedHosts = ['github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com'],
    } = options;
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && !(allowTestUrls && parsed.protocol === 'http:')) {
        throw new UpdateError('untrusted-download-url', `Unsupported URL protocol: ${parsed.protocol}`);
    }
    if (!allowTestUrls && !allowedHosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))) {
        throw new UpdateError('untrusted-download-url', `Unsupported download host: ${parsed.hostname}`);
    }
    if (redirectCount > 5) {
        throw new UpdateError('too-many-redirects', 'Download exceeded the redirect limit.');
    }

    const request = parsed.protocol === 'http:' ? httpRequest : httpsRequest;
    return new Promise((resolvePromise, rejectPromise) => {
        const req = request(
            parsed,
            {
                headers: {
                    'User-Agent': `easy-prd-testing-updater/${UPDATER_VERSION}`,
                    Accept: 'application/octet-stream, application/json',
                },
            },
            (response) => {
                const status = response.statusCode ?? 0;
                if (status >= 300 && status < 400 && response.headers.location) {
                    response.resume();
                    const nextUrl = new URL(response.headers.location, parsed).toString();
                    requestBuffer(nextUrl, options, redirectCount + 1)
                        .then(resolvePromise)
                        .catch(rejectPromise);
                    return;
                }
                if (status !== 200) {
                    response.resume();
                    rejectPromise(new UpdateError('download-failed', `Download returned HTTP ${status}: ${url}`));
                    return;
                }
                const chunks = [];
                let total = 0;
                response.on('data', (chunk) => {
                    total += chunk.length;
                    if (total > maxBytes) {
                        response.destroy(
                            new UpdateError('download-too-large', `Download exceeded ${maxBytes} bytes.`),
                        );
                        return;
                    }
                    chunks.push(chunk);
                });
                response.on('end', () => resolvePromise(Buffer.concat(chunks)));
                response.on('error', rejectPromise);
            },
        );
        req.setTimeout(timeoutMs, () => {
            req.destroy(new UpdateError('download-timeout', `Download timed out: ${url}`));
        });
        req.on('error', rejectPromise);
        req.end();
    });
}

export async function downloadBuffer(url, options = {}) {
    const attempts = (options.retries ?? 2) + 1;
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await requestBuffer(url, options);
        } catch (error) {
            lastError = error;
            if (attempt === attempts || error.code === 'untrusted-download-url') throw error;
        }
    }
    throw lastError;
}

async function readJson(path, code) {
    try {
        return JSON.parse(await readFile(path, 'utf8'));
    } catch (error) {
        throw new UpdateError(code, `Unable to read JSON file ${path}: ${error.message}`);
    }
}

async function pathExists(path) {
    try {
        await lstat(path);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

async function runCommand(command, args, options = {}) {
    return new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(command, args, {
            cwd: options.cwd,
            env: options.env ?? process.env,
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        const stdout = [];
        const stderr = [];
        child.stdout.on('data', (chunk) => stdout.push(chunk));
        child.stderr.on('data', (chunk) => stderr.push(chunk));
        child.on('error', (error) => rejectPromise(error));
        child.on('close', (code) => {
            const stdoutBuffer = Buffer.concat(stdout);
            const stderrBuffer = Buffer.concat(stderr);
            const result = {
                code,
                stdout: options.binary ? stdoutBuffer : stdoutBuffer.toString('utf8').trim(),
                stderr: stderrBuffer.toString('utf8').trim(),
            };
            if (code !== 0 && !options.allowFailure) {
                rejectPromise(
                    new UpdateError(
                        'command-failed',
                        `${command} ${args.join(' ')} failed with exit code ${code}.`,
                        result,
                    ),
                );
                return;
            }
            resolvePromise(result);
        });
    });
}

async function getPluginVersion(root) {
    const plugin = await readJson(join(root, '.codex-plugin', 'plugin.json'), 'invalid-installation');
    return parseSemver(plugin.version).raw;
}

function normalizeOfficialRemote(value) {
    const remote = value.trim().replace(/\.git$/, '').replace(/\/$/, '');
    return TRUSTED_REPOSITORIES.some(
        (repository) =>
            remote === `git@github.com:${repository}` ||
            remote === `https://github.com/${repository}` ||
            remote === `ssh://git@github.com/${repository}`,
    );
}

async function git(root, args, options = {}) {
    return runCommand('git', ['-C', root, ...args], options);
}

async function managedChanges(root, packageManifest) {
    const expected = new Map(packageManifest.files.map((entry) => [entry.path, entry]));
    const changes = [];

    async function walk(current, prefix = '') {
        const entries = await readdir(current, { withFileTypes: true });
        for (const entry of entries) {
            const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
            const absolutePath = join(current, entry.name);
            if (relativePath === PACKAGE_MANIFEST) continue;
            if (entry.isSymbolicLink()) {
                changes.push({ path: relativePath, reason: 'unsupported-link' });
                continue;
            }
            if (entry.isDirectory()) {
                await walk(absolutePath, relativePath);
                continue;
            }
            if (!entry.isFile()) {
                changes.push({ path: relativePath, reason: 'unsupported-file-type' });
                continue;
            }
            const expectedEntry = expected.get(relativePath);
            const actualDigest = `sha256:${await sha256File(absolutePath)}`;
            if (!expectedEntry) {
                changes.push({ path: relativePath, reason: 'unknown-file', actualDigest });
                continue;
            }
            expected.delete(relativePath);
            if (actualDigest !== expectedEntry.digest) {
                changes.push({ path: relativePath, reason: 'modified', actualDigest });
            }
        }
    }

    await walk(root);
    for (const [path, entry] of expected) {
        changes.push({ path, reason: 'missing', expectedDigest: entry.digest });
    }
    return changes.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}

function installationStateDigest(installation) {
    return `sha256:${sha256(JSON.stringify(installation.changes ?? []))}`;
}

export async function detectInstallation(root, options = {}) {
    const resolvedRoot = resolve(root);
    const realRoot = await realpath(resolvedRoot).catch(() => resolvedRoot);
    const presentedRoot = options.presentedRoot ? resolve(options.presentedRoot) : resolvedRoot;
    const realPresentedRoot = await realpath(presentedRoot).catch(() => presentedRoot);
    const version = await getPluginVersion(realRoot);
    const presentedRootStat = await lstat(presentedRoot).catch(() => null);

    if (presentedRootStat?.isSymbolicLink()) {
        return {
            type: 'symlink',
            root: presentedRoot,
            realPath: realPresentedRoot,
            version,
            changes: [],
            supported: false,
            reason: 'symlink-installation',
        };
    }

    if (await pathExists(join(realRoot, '.git'))) {
        const origin = await git(realRoot, ['remote', 'get-url', 'origin'], { allowFailure: true });
        const trustedTestOrigin = options.allowTestGitOrigin && origin.stdout === options.allowTestGitOrigin;
        if (origin.code !== 0 || (!normalizeOfficialRemote(origin.stdout) && !trustedTestOrigin)) {
            return {
                type: 'git',
                root: realRoot,
                version,
                changes: [],
                supported: false,
                reason: 'untrusted-git-origin',
                origin: origin.stdout || null,
            };
        }
        const statusResult = await git(realRoot, ['status', '--porcelain', '--untracked-files=all']);
        const changes = statusResult.stdout
            ? statusResult.stdout.split(/\r?\n/).filter(Boolean).map((line) => ({ path: line.slice(3), reason: line.slice(0, 2).trim() || 'modified' }))
            : [];
        return {
            type: 'git',
            root: realRoot,
            version,
            changes,
            supported: true,
            origin: origin.stdout,
        };
    }

    const manifestPath = join(realRoot, PACKAGE_MANIFEST);
    if (await pathExists(manifestPath)) {
        const packageManifest = validatePackageManifest(
            await readJson(manifestPath, 'invalid-package-manifest'),
            version,
        );
        return {
            type: 'managed',
            root: realRoot,
            version,
            changes: await managedChanges(realRoot, packageManifest),
            supported: true,
            packageManifest,
        };
    }

    return {
        type: 'unknown',
        root: realRoot,
        version,
        changes: [],
        supported: false,
        reason: 'incomplete-or-unmanaged-installation',
    };
}

async function fetchUpdateManifest(url, options = {}) {
    const buffer = await downloadBuffer(url, {
        maxBytes: MAX_MANIFEST_BYTES,
        allowTestUrls: options.allowTestUrls,
        allowedHosts: options.allowedHosts,
        retries: options.retries,
    });
    let parsed;
    try {
        parsed = JSON.parse(buffer.toString('utf8'));
    } catch (error) {
        throw new UpdateError('invalid-manifest-json', `Unable to parse update manifest: ${error.message}`);
    }
    return validateUpdateManifest(parsed, options);
}

async function fetchDefaultUpdateManifest(options = {}, targetVersion = null) {
    const currentUrl = targetVersion
        ? `https://github.com/${OFFICIAL_REPOSITORY}/releases/download/v${targetVersion}/latest-v2.json`
        : LATEST_MANIFEST_URL;
    try {
        return await fetchUpdateManifest(currentUrl, options);
    } catch (error) {
        if (error?.code !== 'download-failed') throw error;
        const legacyUrl = targetVersion
            ? `https://github.com/${LEGACY_REPOSITORY}/releases/download/v${targetVersion}/latest.json`
            : LEGACY_LATEST_MANIFEST_URL;
        return fetchUpdateManifest(legacyUrl, options);
    }
}

function runtimeCompatibility(manifest) {
    const nodeVersion = parseSemver(process.versions.node).raw;
    if (compareSemver(nodeVersion, manifest.minimumNodeVersion) < 0) {
        return {
            compatible: false,
            reason: 'node-version-too-old',
            required: manifest.minimumNodeVersion,
            actual: nodeVersion,
        };
    }
    if (compareSemver(UPDATER_VERSION, manifest.minimumUpdaterVersion) < 0) {
        return {
            compatible: false,
            reason: 'updater-version-too-old',
            required: manifest.minimumUpdaterVersion,
            actual: UPDATER_VERSION,
        };
    }
    if (manifest.requiresManualMigration) {
        return { compatible: false, reason: 'manual-migration-required' };
    }
    return { compatible: true };
}

export async function checkForUpdate(options = {}) {
    const root = resolve(options.root);
    const installation = await detectInstallation(root, {
        presentedRoot: options.presentedRoot,
        allowTestGitOrigin: options.allowTestGitOrigin,
    });
    const manifest = options.manifestUrl
        ? await fetchUpdateManifest(options.manifestUrl, options)
        : await fetchDefaultUpdateManifest(options);
    const compatibility = runtimeCompatibility(manifest);
    const comparison = compareSemver(installation.version, manifest.version);

    let status = 'update-available';
    if (!installation.supported) status = 'unsupported-installation';
    else if (!compatibility.compatible) status = 'incompatible-update';
    else if (comparison === 0) status = 'up-to-date';
    else if (comparison > 0) status = 'ahead-of-latest';

    return {
        status,
        currentVersion: installation.version,
        targetVersion: manifest.version,
        updaterVersion: UPDATER_VERSION,
        installType: installation.type,
        installPath: installation.root,
        realPath: installation.realPath,
        localChanges: installation.changes,
        localStateDigest: installationStateDigest(installation),
        installationReason: installation.reason,
        compatibility,
        expectedDigest: manifest.asset.digest,
        assetName: manifest.asset.name,
        releaseNotesUrl: manifest.releaseNotesUrl,
        highlights: manifest.highlights,
    };
}

function readTarString(header, start, length) {
    const field = header.subarray(start, start + length);
    const zero = field.indexOf(0);
    return field.subarray(0, zero === -1 ? field.length : zero).toString('utf8').trim();
}

function readTarOctal(header, start, length) {
    const value = readTarString(header, start, length).replace(/\0/g, '').trim();
    if (!value) return 0;
    if (!/^[0-7]+$/.test(value)) {
        throw new UpdateError('invalid-archive', `Invalid tar numeric field: ${value}`);
    }
    return Number.parseInt(value, 8);
}

function safeArchivePath(value) {
    if (!value || value.includes('\\') || value.includes('\0') || posix.isAbsolute(value)) {
        throw new UpdateError('unsafe-archive-path', `Unsafe archive path: ${value}`);
    }
    const normalizedPath = posix.normalize(value);
    if (
        normalizedPath !== value.replace(/\/$/, '') ||
        normalizedPath === '..' ||
        normalizedPath.startsWith('../')
    ) {
        throw new UpdateError('unsafe-archive-path', `Unsafe archive path: ${value}`);
    }
    if (normalizedPath !== PACKAGE_ROOT && !normalizedPath.startsWith(`${PACKAGE_ROOT}/`)) {
        throw new UpdateError('unsafe-archive-path', `Archive entry is outside ${PACKAGE_ROOT}: ${value}`);
    }
    return normalizedPath;
}

export async function extractReleaseArchive(archiveBuffer, destination, options = {}) {
    let tar;
    try {
        tar = gunzipSync(archiveBuffer, { maxOutputLength: options.maxExtractedBytes ?? MAX_EXTRACTED_BYTES });
    } catch (error) {
        throw new UpdateError('invalid-archive', `Unable to decompress release archive: ${error.message}`);
    }
    const maxFiles = options.maxFiles ?? MAX_EXTRACTED_FILES;
    let offset = 0;
    let fileCount = 0;

    while (offset + 512 <= tar.length) {
        const header = tar.subarray(offset, offset + 512);
        offset += 512;
        if (header.every((byte) => byte === 0)) break;

        const storedChecksum = readTarOctal(header, 148, 8);
        const checksumHeader = Buffer.from(header);
        checksumHeader.fill(0x20, 148, 156);
        const actualChecksum = checksumHeader.reduce((sum, byte) => sum + byte, 0);
        if (storedChecksum !== actualChecksum) {
            throw new UpdateError('invalid-archive', 'Tar header checksum mismatch.');
        }

        const name = readTarString(header, 0, 100);
        const prefix = readTarString(header, 345, 155);
        const archivePath = safeArchivePath(prefix ? `${prefix}/${name}` : name);
        const size = readTarOctal(header, 124, 12);
        const mode = readTarOctal(header, 100, 8);
        const type = String.fromCharCode(header[156] || 0x30);
        if (!['0', '\0', '5'].includes(type)) {
            throw new UpdateError('unsupported-archive-entry', `Unsupported tar entry type ${type}: ${archivePath}`);
        }
        if (offset + size > tar.length) {
            throw new UpdateError('invalid-archive', `Truncated archive entry: ${archivePath}`);
        }
        fileCount += 1;
        if (fileCount > maxFiles) {
            throw new UpdateError('archive-file-limit', `Archive exceeds ${maxFiles} entries.`);
        }

        const outputPath = resolve(destination, ...archivePath.split('/'));
        const destinationRoot = resolve(destination);
        if (outputPath !== destinationRoot && !outputPath.startsWith(`${destinationRoot}${sep}`)) {
            throw new UpdateError('unsafe-archive-path', `Archive path escapes destination: ${archivePath}`);
        }

        if (type === '5') {
            await mkdir(outputPath, { recursive: true });
        } else {
            await mkdir(dirname(outputPath), { recursive: true });
            await writeFile(outputPath, tar.subarray(offset, offset + size), { mode: mode & 0o777 });
            if (process.platform !== 'win32') await chmod(outputPath, mode & 0o777);
        }
        offset += Math.ceil(size / 512) * 512;
    }

    if (fileCount === 0) throw new UpdateError('invalid-archive', 'Release archive is empty.');
    return { root: join(destination, PACKAGE_ROOT), fileCount };
}

async function verifyPackageFiles(root, packageManifest, options = {}) {
    if (options.allowUnknown) {
        const changes = [];
        for (const entry of packageManifest.files) {
            const absolutePath = join(root, ...entry.path.split('/'));
            if (!(await pathExists(absolutePath))) {
                changes.push({ path: entry.path, reason: 'missing' });
                continue;
            }
            const fileStat = await lstat(absolutePath);
            if (!fileStat.isFile()) {
                changes.push({ path: entry.path, reason: 'unsupported-file-type' });
                continue;
            }
            const digest = `sha256:${await sha256File(absolutePath)}`;
            if (digest !== entry.digest) changes.push({ path: entry.path, reason: 'modified' });
        }
        if (changes.length > 0) {
            throw new UpdateError('package-content-mismatch', 'Package files do not match the release manifest.', changes);
        }
        return;
    }
    const changes = await managedChanges(root, packageManifest);
    if (changes.length > 0) {
        throw new UpdateError('package-content-mismatch', 'Package files do not match the release manifest.', changes);
    }
}

async function validateInstallStructure(root, expectedVersion, packageManifest, options = {}) {
    const required = [
        'SKILL.md',
        '.codex-plugin/plugin.json',
        'README.md',
        'README.en.md',
        'scripts/validate-plugin.sh',
        'scripts/easy-prd-testing.mjs',
        'skills/easy-prd-testing/SKILL.md',
        'skills/self-update/SKILL.md',
    ];
    for (const path of required) {
        if (!(await pathExists(join(root, path)))) {
            throw new UpdateError('invalid-installation', `Release is missing required file: ${path}`);
        }
    }
    const version = await getPluginVersion(root);
    if (version !== normalizeVersion(expectedVersion)) {
        throw new UpdateError(
            'package-version-mismatch',
            `Installed plugin version ${version} does not match ${expectedVersion}.`,
        );
    }
    if (!options.skipFileVerification) await verifyPackageFiles(root, packageManifest, options);
}

async function verifyGitTree(root, packageManifest) {
    const expectedPaths = packageManifest.files.map((entry) => entry.path).sort((a, b) => a.localeCompare(b, 'en'));
    const trackedResult = await git(root, ['ls-files', '-z']);
    const trackedPaths = trackedResult.stdout
        .split('\0')
        .filter(Boolean)
        .filter((path) => path !== PACKAGE_MANIFEST)
        .sort((a, b) => a.localeCompare(b, 'en'));
    if (JSON.stringify(trackedPaths) !== JSON.stringify(expectedPaths)) {
        throw new UpdateError(
            'git-tree-mismatch',
            'Git tracked files do not match the release package manifest.',
            { expectedPaths, trackedPaths },
        );
    }
    const changes = [];
    for (const entry of packageManifest.files) {
        const blob = await git(root, ['show', `HEAD:${entry.path}`], { binary: true, allowFailure: true });
        if (blob.code !== 0) {
            changes.push({ path: entry.path, reason: 'missing-git-blob' });
            continue;
        }
        if (`sha256:${sha256(blob.stdout)}` !== entry.digest) {
            changes.push({ path: entry.path, reason: 'git-blob-mismatch' });
        }
    }
    if (changes.length > 0) {
        throw new UpdateError('git-tree-mismatch', 'Git release content does not match the package manifest.', changes);
    }
}

export async function validateCurrentInstallation(root) {
    const installRoot = resolve(root);
    const version = await getPluginVersion(installRoot);
    const manifest = validatePackageManifest(
        await readJson(join(installRoot, PACKAGE_MANIFEST), 'invalid-package-manifest'),
        version,
    );
    const hasGitMetadata = await pathExists(join(installRoot, '.git'));
    if (hasGitMetadata) {
        const statusResult = await git(installRoot, ['status', '--porcelain', '--untracked-files=all']);
        if (statusResult.stdout) {
            await validateInstallStructure(installRoot, version, manifest, { allowUnknown: true });
        } else {
            await validateInstallStructure(installRoot, version, manifest, { skipFileVerification: true });
            await verifyGitTree(installRoot, manifest);
        }
    } else {
        await validateInstallStructure(installRoot, version, manifest);
    }
    return {
        status: 'valid',
        version,
        installPath: installRoot,
        managedFiles: manifest.files.length,
        installType: hasGitMetadata ? 'git' : 'managed',
    };
}

async function runRepositoryValidation(root) {
    const bash = await runCommand('bash', ['--version'], { allowFailure: true }).catch(() => null);
    if (bash?.code === 0) {
        await runCommand('bash', ['scripts/validate-plugin.sh'], {
            cwd: root,
            env: { ...process.env, EASY_PRD_TESTING_SKIP_UPDATE_TESTS: '1' },
        });
        return 'scripts/validate-plugin.sh';
    }
    await runCommand(process.execPath, ['scripts/test-xmind-export.mjs'], { cwd: root });
    return 'node-fallback';
}

async function loadExtractedPackage(root, expectedVersion) {
    const manifestPath = join(root, PACKAGE_MANIFEST);
    const packageManifest = validatePackageManifest(
        await readJson(manifestPath, 'invalid-package-manifest'),
        expectedVersion,
    );
    await validateInstallStructure(root, expectedVersion, packageManifest);
    return packageManifest;
}

function lockPathFor(root) {
    return join(tmpdir(), `easy-prd-testing-${sha256(resolve(root)).slice(0, 16)}.update.lock`);
}

async function processExists(pid) {
    if (!Number.isInteger(pid) || pid <= 0) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return error.code === 'EPERM';
    }
}

export async function acquireUpdateLock(root) {
    const path = lockPathFor(root);
    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            const handle = await open(path, 'wx');
            await handle.writeFile(
                `${JSON.stringify({ pid: process.pid, root: resolve(root), createdAt: new Date().toISOString() })}\n`,
            );
            await handle.close();
            return async () => rm(path, { force: true });
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
            let stale = true;
            try {
                const lock = JSON.parse(await readFile(path, 'utf8'));
                const createdAt = Date.parse(lock.createdAt);
                stale = Date.now() - createdAt > LOCK_STALE_MS || !(await processExists(lock.pid));
            } catch {
                stale = true;
            }
            if (!stale) {
                throw new UpdateError('update-in-progress', 'Another Easy PRD Testing upgrade is already running.');
            }
            await rm(path, { force: true });
        }
    }
    throw new UpdateError('update-lock-failed', 'Unable to acquire the update lock.');
}

async function prepareRelease(manifest, options) {
    const archive = await downloadBuffer(manifest.asset.downloadUrl, {
        maxBytes: MAX_ARCHIVE_BYTES,
        allowTestUrls: options.allowTestUrls,
        allowedHosts: options.allowedHosts,
        retries: options.retries,
    });
    const actualDigest = `sha256:${sha256(archive)}`;
    if (actualDigest !== manifest.asset.digest) {
        throw new UpdateError('asset-digest-mismatch', 'Downloaded release asset failed SHA-256 verification.', {
            expected: manifest.asset.digest,
            actual: actualDigest,
        });
    }
    if (manifest.asset.size !== null && archive.length !== manifest.asset.size) {
        throw new UpdateError('asset-size-mismatch', 'Downloaded release asset size does not match the manifest.');
    }
    return archive;
}

async function swapManagedInstallation(installation, stagedRoot, packageManifest, targetVersion) {
    const root = installation.root;
    const parent = dirname(root);
    const transactionRoot = dirname(stagedRoot);
    const previousRoot = join(transactionRoot, 'previous');
    const failedRoot = join(transactionRoot, 'failed');
    let movedPrevious = false;
    let movedNew = false;

    process.chdir(parent);
    try {
        await rename(root, previousRoot);
        movedPrevious = true;
        await rename(stagedRoot, root);
        movedNew = true;
        await validateInstallStructure(root, targetVersion, packageManifest);
        const validation = await runRepositoryValidation(root);
        await rm(previousRoot, { recursive: true, force: true });
        return validation;
    } catch (error) {
        let recoveryFailure;
        if (movedNew && (await pathExists(root))) {
            try {
                await rename(root, failedRoot);
            } catch (renameError) {
                recoveryFailure = renameError;
            }
        }
        if (!recoveryFailure && movedPrevious && (await pathExists(previousRoot))) {
            try {
                await rename(previousRoot, root);
            } catch (renameError) {
                recoveryFailure = renameError;
            }
        }
        if (recoveryFailure) {
            const restoreError = new UpdateError(
                'automatic-restore-failed',
                'The upgrade failed and the original installation could not be restored automatically.',
                {
                    originalError: error.message,
                    recoveryError: recoveryFailure.message,
                    originalInstallationPath: previousRoot,
                    requestedInstallPath: root,
                },
            );
            restoreError.preserveTransactionRoot = true;
            throw restoreError;
        }
        await rm(failedRoot, { recursive: true, force: true }).catch(() => {});
        throw error;
    }
}

async function swapGitInstallation(installation, stagedRoot, packageManifest, targetVersion) {
    const root = installation.root;
    const clean = await git(root, ['status', '--porcelain', '--untracked-files=all']);
    if (clean.stdout) {
        throw new UpdateError('git-worktree-dirty', 'Git installations cannot be upgraded with local changes.', clean.stdout);
    }
    const originalCommit = (await git(root, ['rev-parse', 'HEAD'])).stdout;
    const originalBranch = (
        await git(root, ['symbolic-ref', '--quiet', '--short', 'HEAD'], { allowFailure: true })
    ).stdout;
    const tag = `v${targetVersion}`;
    let switched = false;

    try {
        await git(root, ['fetch', 'origin', `refs/tags/${tag}:refs/tags/${tag}`]);
        await git(root, ['checkout', '--detach', `refs/tags/${tag}`]);
        switched = true;
        await validateInstallStructure(root, targetVersion, packageManifest, { skipFileVerification: true });
        await verifyGitTree(root, packageManifest);
        const validation = await runRepositoryValidation(root);
        return validation;
    } catch (error) {
        if (switched) {
            const restoreArgs = originalBranch
                ? ['checkout', originalBranch]
                : ['checkout', '--detach', originalCommit];
            await git(root, restoreArgs, { allowFailure: true }).catch(() => {});
        }
        throw error;
    } finally {
        await rm(dirname(stagedRoot), { recursive: true, force: true }).catch(() => {});
    }
}

export async function performUpgrade(options = {}) {
    if (!options.confirmed) {
        throw new UpdateError('confirmation-required', 'Upgrade requires explicit user confirmation.');
    }
    const targetVersion = parseSemver(options.targetVersion).raw;
    const expectedDigest = validateDigest(options.expectedDigest);
    const expectedStateDigest = validateDigest(options.expectedStateDigest);
    const root = resolve(options.root);
    const installation = await detectInstallation(root, {
        presentedRoot: options.presentedRoot,
        allowTestGitOrigin: options.allowTestGitOrigin,
    });
    if (!installation.supported) {
        throw new UpdateError(
            installation.reason ?? 'unsupported-installation',
            `Unsupported installation type: ${installation.type}`,
            installation,
        );
    }
    if (installationStateDigest(installation) !== expectedStateDigest) {
        throw new UpdateError(
            'installation-state-changed',
            'The installation changed after the update check. Run the check and confirm again.',
        );
    }
    if (compareSemver(installation.version, targetVersion) >= 0) {
        throw new UpdateError(
            'target-not-newer',
            `Target v${targetVersion} is not newer than current v${installation.version}.`,
        );
    }
    if (installation.type === 'git' && installation.changes.length > 0) {
        throw new UpdateError('git-worktree-dirty', 'Git installations cannot be upgraded with local changes.', installation.changes);
    }
    if (installation.type === 'managed' && installation.changes.length > 0 && !options.force) {
        throw new UpdateError('local-modifications', 'Managed installation contains local modifications.', installation.changes);
    }

    const manifest = options.manifestUrl
        ? await fetchUpdateManifest(options.manifestUrl, options)
        : await fetchDefaultUpdateManifest(options, targetVersion);
    if (manifest.version !== targetVersion || manifest.asset.digest !== expectedDigest) {
        throw new UpdateError(
            'confirmed-release-changed',
            'The confirmed release version or digest changed. Run the update check again.',
        );
    }
    const compatibility = runtimeCompatibility(manifest);
    if (!compatibility.compatible) {
        throw new UpdateError('incompatible-update', 'The target release cannot be installed automatically.', compatibility);
    }

    const releaseLock = await acquireUpdateLock(root);
    let transactionRoot;
    let preserveTransactionRoot = false;
    try {
        const refreshed = await detectInstallation(root, {
            presentedRoot: options.presentedRoot,
            allowTestGitOrigin: options.allowTestGitOrigin,
        });
        if (installationStateDigest(refreshed) !== expectedStateDigest) {
            throw new UpdateError(
                'installation-state-changed',
                'The installation changed after confirmation. Run the update check again.',
            );
        }
        if (refreshed.type === 'git' && refreshed.changes.length > 0) {
            throw new UpdateError('git-worktree-dirty', 'Git installation changed after confirmation.', refreshed.changes);
        }
        if (refreshed.type === 'managed' && refreshed.changes.length > 0 && !options.force) {
            throw new UpdateError('local-modifications', 'Managed installation changed after confirmation.', refreshed.changes);
        }

        const archive = await prepareRelease(manifest, options);
        transactionRoot = await mkdtemp(join(dirname(root), `.${basename(root)}.update-`));
        const extracted = await extractReleaseArchive(archive, transactionRoot);
        const packageManifest = await loadExtractedPackage(extracted.root, targetVersion);
        await runRepositoryValidation(extracted.root);

        const validation = installation.type === 'managed'
            ? await swapManagedInstallation(installation, extracted.root, packageManifest, targetVersion)
            : await swapGitInstallation(installation, extracted.root, packageManifest, targetVersion);

        await rm(transactionRoot, { recursive: true, force: true }).catch(() => {});
        return {
            status: 'updated',
            previousVersion: installation.version,
            currentVersion: targetVersion,
            installType: installation.type,
            installPath: installation.root,
            digest: manifest.asset.digest,
            validation,
            reloadRequired: true,
            releaseNotesUrl: manifest.releaseNotesUrl,
        };
    } catch (error) {
        preserveTransactionRoot = error.preserveTransactionRoot === true;
        throw error;
    } finally {
        if (transactionRoot && !preserveTransactionRoot) {
            await rm(transactionRoot, { recursive: true, force: true }).catch(() => {});
        }
        await releaseLock();
    }
}

function parseArguments(argv) {
    const [command = 'help', ...rest] = argv;
    const options = { command, json: false, yes: false, force: false };
    for (let index = 0; index < rest.length; index += 1) {
        const arg = rest[index];
        if (arg === '--json') options.json = true;
        else if (arg === '--yes') options.yes = true;
        else if (arg === '--force') options.force = true;
        else if (arg === '--to') options.targetVersion = rest[++index];
        else if (arg === '--expected-digest') options.expectedDigest = rest[++index];
        else if (arg === '--expected-state') options.expectedStateDigest = rest[++index];
        else throw new UpdateError('unknown-argument', `Unknown argument: ${arg}`);
    }
    return options;
}

function humanOutput(result) {
    if (result.status === 'update-available') {
        return `Easy PRD Testing v${result.currentVersion} → v${result.targetVersion}\n${result.releaseNotesUrl}`;
    }
    if (result.status === 'up-to-date') return `Easy PRD Testing v${result.currentVersion} is up to date.`;
    if (result.status === 'updated') {
        return `Easy PRD Testing upgraded from v${result.previousVersion} to v${result.currentVersion}. Reload your AI Skills or start a new session.`;
    }
    return JSON.stringify(result, null, 2);
}

function printResult(result, asJson) {
    process.stdout.write(`${asJson ? JSON.stringify(result) : humanOutput(result)}\n`);
}

async function main() {
    const args = parseArguments(process.argv.slice(2));
    const scriptPath = resolve(process.argv[1]);
    const presentedRoot = resolve(dirname(scriptPath), '..');
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

    if (args.command === 'version') {
        const installation = await detectInstallation(root, { presentedRoot });
        printResult(
            {
                status: 'version',
                version: installation.version,
                updaterVersion: UPDATER_VERSION,
                installType: installation.type,
                installPath: installation.root,
            },
            args.json,
        );
        return;
    }
    if (args.command === 'validate') {
        printResult(await validateCurrentInstallation(root), args.json);
        return;
    }
    if (args.command === 'check') {
        printResult(await checkForUpdate({ root, presentedRoot }), args.json);
        return;
    }
    if (args.command === 'upgrade') {
        if (!args.targetVersion || !args.expectedDigest || !args.expectedStateDigest) {
            throw new UpdateError(
                'missing-argument',
                'upgrade requires --to <version>, --expected-digest <sha256:...>, and --expected-state <sha256:...>.',
            );
        }
        printResult(
            await performUpgrade({
                root,
                presentedRoot,
                targetVersion: args.targetVersion,
                expectedDigest: args.expectedDigest,
                expectedStateDigest: args.expectedStateDigest,
                confirmed: args.yes,
                force: args.force,
            }),
            args.json,
        );
        return;
    }

    process.stdout.write(
        [
            'Easy PRD Testing updater',
            '',
            'Commands:',
            '  version [--json]',
            '  validate [--json]',
            '  check [--json]',
            '  upgrade --to <version> --expected-digest <sha256:...> --expected-state <sha256:...> --yes [--force] [--json]',
        ].join('\n') + '\n',
    );
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectRun) {
    main().catch((error) => {
        const payload = {
            status: 'error',
            code: error.code ?? 'unexpected-error',
            message: error.message,
            details: error.details,
        };
        const wantsJson = process.argv.includes('--json');
        process.stderr.write(`${wantsJson ? JSON.stringify(payload) : `${payload.code}: ${payload.message}`}\n`);
        process.exitCode = 1;
    });
}
