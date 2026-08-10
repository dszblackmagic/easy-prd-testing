#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import {
    cp,
    lstat,
    mkdtemp,
    mkdir,
    readFile,
    readdir,
    realpath,
    rm,
    stat,
    writeFile,
} from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';

import {
    PACKAGE_MANIFEST,
    acquireUpdateLock,
    checkForUpdate,
    compareSemver,
    detectInstallation,
    extractReleaseArchive,
    performUpgrade,
    validateUpdateManifest,
} from './easy-prd-testing.mjs';
import { buildReleasePackage } from './build-release.mjs';

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoots = [];

function digest(data) {
    return `sha256:${createHash('sha256').update(data).digest('hex')}`;
}

async function temporaryDirectory(label) {
    const path = await mkdtemp(join(tmpdir(), `easy-prd-testing-${label}-`));
    temporaryRoots.push(path);
    return path;
}

async function command(commandName, args, options = {}) {
    return execFileAsync(commandName, args, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        windowsHide: true,
    });
}

function writeTarString(header, value, offset, length) {
    Buffer.from(value).copy(header, offset, 0, length);
}

function writeTarOctal(header, value, offset, length) {
    writeTarString(header, `${value.toString(8).padStart(length - 1, '0')}\0`, offset, length);
}

function unsafeTar(path, type = '0', data = Buffer.from('test')) {
    const header = Buffer.alloc(512);
    writeTarString(header, path, 0, 100);
    writeTarOctal(header, 0o644, 100, 8);
    writeTarOctal(header, data.length, 124, 12);
    header.fill(0x20, 148, 156);
    header[156] = type.charCodeAt(0);
    writeTarString(header, 'ustar\0', 257, 6);
    writeTarString(header, '00', 263, 2);
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    writeTarString(header, `${checksum.toString(8).padStart(6, '0')}\0 `, 148, 8);
    const padding = Buffer.alloc((512 - (data.length % 512)) % 512);
    return gzipSync(Buffer.concat([header, data, padding, Buffer.alloc(1024)]));
}

async function listFiles(root, prefix = '') {
    const result = [];
    for (const entry of await readdir(root, { withFileTypes: true })) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (path === PACKAGE_MANIFEST || path === '.git') continue;
        const absolutePath = join(root, entry.name);
        if (entry.isDirectory()) result.push(...(await listFiles(absolutePath, path)));
        else if (entry.isFile()) result.push(path);
    }
    return result.sort((a, b) => a.localeCompare(b, 'en'));
}

async function rewriteManagedVersion(root, version) {
    const pluginPath = join(root, '.codex-plugin', 'plugin.json');
    const plugin = JSON.parse(await readFile(pluginPath, 'utf8'));
    plugin.version = version;
    await writeFile(pluginPath, `${JSON.stringify(plugin, null, 2)}\n`);
    const files = [];
    for (const path of await listFiles(root)) {
        const absolutePath = join(root, ...path.split('/'));
        const data = await readFile(absolutePath);
        const fileStat = await stat(absolutePath);
        files.push({
            path,
            digest: digest(data),
            mode: fileStat.mode & 0o111 ? '755' : '644',
        });
    }
    await writeFile(
        join(root, PACKAGE_MANIFEST),
        `${JSON.stringify({ schemaVersion: 1, version, rootDirectory: 'easy-prd-testing', files }, null, 2)}\n`,
    );
}

function updateManifest(baseUrl, archive, metadata) {
    return {
        schemaVersion: 1,
        version: '0.1.2',
        channel: 'stable',
        minimumUpdaterVersion: '0.1.2',
        minimumNodeVersion: '18.0.0',
        requiresManualMigration: false,
        asset: {
            name: 'easy-prd-testing-v0.1.2.tar.gz',
            size: archive.length,
            digest: digest(archive),
            downloadUrl: `${baseUrl}/easy-prd-testing-v0.1.2.tar.gz`,
        },
        releaseNotesUrl: `${baseUrl}/release-notes`,
        highlights: metadata.highlights,
    };
}

async function fixtureServer(archive, metadata, options = {}) {
    const server = createServer((request, response) => {
        const baseUrl = `http://127.0.0.1:${server.address().port}`;
        if (request.url?.endsWith('.tar.gz')) {
            const body = options.corruptArchive ? Buffer.from('corrupt') : archive;
            response.writeHead(200, { 'content-type': 'application/gzip' });
            response.end(body);
            return;
        }
        if (request.url?.includes('latest.json')) {
            response.writeHead(200, { 'content-type': 'application/json' });
            response.end(JSON.stringify(updateManifest(baseUrl, archive, metadata)));
            return;
        }
        response.writeHead(200, { 'content-type': 'text/markdown' });
        response.end('# Release notes');
    });
    await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
    return {
        baseUrl: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((resolvePromise) => server.close(resolvePromise)),
    };
}

async function extractFixture(archive, label) {
    const root = await temporaryDirectory(label);
    const extracted = await extractReleaseArchive(archive, root);
    return extracted.root;
}

async function expectUpdateError(action, code) {
    await assert.rejects(action, (error) => error?.code === code);
}

async function run() {
    assert.equal(compareSemver('0.1.1', '0.1.2'), -1);
    assert.equal(compareSemver('v0.1.2', '0.1.2'), 0);
    assert.equal(compareSemver('0.2.0', '0.1.2'), 1);

    const buildRoot = await temporaryDirectory('build');
    const build = await buildReleasePackage({
        root: repositoryRoot,
        outputDir: buildRoot,
        tag: 'v0.1.2',
        includeUntracked: true,
    });
    const archive = await readFile(build.assetPath);
    assert.equal(build.metadata.highlights.length, 4);
    assert.equal(build.metadata.localDigest, digest(archive));
    const secondBuildRoot = await temporaryDirectory('build-repeat');
    const secondBuild = await buildReleasePackage({
        root: repositoryRoot,
        outputDir: secondBuildRoot,
        tag: 'v0.1.2',
        includeUntracked: true,
    });
    assert.equal(secondBuild.metadata.localDigest, build.metadata.localDigest);

    const extractedRoot = await extractFixture(archive, 'extract');
    assert.equal(JSON.parse(await readFile(join(extractedRoot, '.codex-plugin', 'plugin.json'))).version, '0.1.2');
    assert.ok((await lstat(join(extractedRoot, PACKAGE_MANIFEST))).isFile());

    await expectUpdateError(async () => {
        const root = await temporaryDirectory('escape');
        await extractReleaseArchive(unsafeTar('easy-prd-testing/../escape'), root);
    }, 'unsafe-archive-path');
    await expectUpdateError(
        async () => {
            const root = await temporaryDirectory('link');
            await extractReleaseArchive(unsafeTar('easy-prd-testing/link', '2'), root);
        },
        'unsupported-archive-entry',
    );

    const sampleManifest = updateManifest('http://127.0.0.1:1', archive, build.metadata);
    assert.equal(validateUpdateManifest(sampleManifest, { allowTestUrls: true }).version, '0.1.2');
    await expectUpdateError(
        async () => validateUpdateManifest({ ...sampleManifest, schemaVersion: 99 }, { allowTestUrls: true }),
        'unsupported-manifest-schema',
    );

    const managedRoot = await extractFixture(archive, 'managed-detect');
    await rewriteManagedVersion(managedRoot, '0.1.1');
    assert.deepEqual((await detectInstallation(managedRoot)).changes, []);
    await writeFile(join(managedRoot, 'README.md'), 'locally modified\n');
    await writeFile(join(managedRoot, 'local.txt'), 'local\n');
    const detectedInstallation = await detectInstallation(managedRoot);
    const detectedChanges = detectedInstallation.changes;
    assert.ok(
        detectedChanges.some((item) => item.path === 'README.md' && item.reason === 'modified'),
        JSON.stringify(detectedInstallation),
    );
    assert.ok(
        detectedChanges.some((item) => item.path === 'local.txt' && item.reason === 'unknown-file'),
        JSON.stringify(detectedChanges),
    );

    const releaseLock = await acquireUpdateLock(managedRoot);
    await expectUpdateError(() => acquireUpdateLock(managedRoot), 'update-in-progress');
    await releaseLock();

    const upgradeRoot = await extractFixture(archive, 'managed-upgrade');
    await rewriteManagedVersion(upgradeRoot, '0.1.1');
    const server = await fixtureServer(archive, build.metadata);
    try {
        const manifestUrl = `${server.baseUrl}/latest.json`;
        const checked = await checkForUpdate({
            root: upgradeRoot,
            manifestUrl,
            allowTestUrls: true,
        });
        assert.equal(checked.status, 'update-available');
        assert.equal(checked.currentVersion, '0.1.1');
        const updated = await performUpgrade({
            root: upgradeRoot,
            manifestUrl,
            allowTestUrls: true,
            targetVersion: checked.targetVersion,
            expectedDigest: checked.expectedDigest,
            expectedStateDigest: checked.localStateDigest,
            confirmed: true,
        });
        assert.equal(updated.status, 'updated');
        assert.equal(updated.currentVersion, '0.1.2');
        assert.equal(await realpath(updated.installPath), await realpath(upgradeRoot));
    } finally {
        await server.close();
    }

    const modifiedRoot = await extractFixture(archive, 'managed-force');
    await rewriteManagedVersion(modifiedRoot, '0.1.1');
    await writeFile(join(modifiedRoot, 'local.txt'), 'remove after success\n');
    const forceServer = await fixtureServer(archive, build.metadata);
    try {
        const manifestUrl = `${forceServer.baseUrl}/latest.json`;
        const checked = await checkForUpdate({ root: modifiedRoot, manifestUrl, allowTestUrls: true });
        await expectUpdateError(
            () => performUpgrade({
                root: modifiedRoot,
                manifestUrl,
                allowTestUrls: true,
                targetVersion: checked.targetVersion,
                expectedDigest: checked.expectedDigest,
                expectedStateDigest: checked.localStateDigest,
                confirmed: true,
            }),
            'local-modifications',
        );
        await writeFile(join(modifiedRoot, 'local.txt'), 'changed after confirmation\n');
        await expectUpdateError(
            () => performUpgrade({
                root: modifiedRoot,
                manifestUrl,
                allowTestUrls: true,
                targetVersion: checked.targetVersion,
                expectedDigest: checked.expectedDigest,
                expectedStateDigest: checked.localStateDigest,
                confirmed: true,
                force: true,
            }),
            'installation-state-changed',
        );
        const rechecked = await checkForUpdate({ root: modifiedRoot, manifestUrl, allowTestUrls: true });
        await performUpgrade({
            root: modifiedRoot,
            manifestUrl,
            allowTestUrls: true,
            targetVersion: rechecked.targetVersion,
            expectedDigest: rechecked.expectedDigest,
            expectedStateDigest: rechecked.localStateDigest,
            confirmed: true,
            force: true,
        });
        await assert.rejects(() => lstat(join(modifiedRoot, 'local.txt')), { code: 'ENOENT' });
    } finally {
        await forceServer.close();
    }

    const failureRoot = await extractFixture(archive, 'managed-failure');
    await rewriteManagedVersion(failureRoot, '0.1.1');
    const failureServer = await fixtureServer(archive, build.metadata, { corruptArchive: true });
    try {
        const manifestUrl = `${failureServer.baseUrl}/latest.json`;
        const checked = await checkForUpdate({ root: failureRoot, manifestUrl, allowTestUrls: true });
        await expectUpdateError(
            () => performUpgrade({
                root: failureRoot,
                manifestUrl,
                allowTestUrls: true,
                targetVersion: checked.targetVersion,
                expectedDigest: checked.expectedDigest,
                expectedStateDigest: checked.localStateDigest,
                confirmed: true,
            }),
            'asset-digest-mismatch',
        );
        assert.equal(JSON.parse(await readFile(join(failureRoot, '.codex-plugin', 'plugin.json'))).version, '0.1.1');
    } finally {
        await failureServer.close();
    }

    const bareRoot = await temporaryDirectory('git-origin');
    const sourceRoot = await temporaryDirectory('git-source');
    const gitInstallParent = await temporaryDirectory('git-install');
    const gitInstall = join(gitInstallParent, 'easy-prd-testing');
    await command('git', ['init', '--bare', bareRoot]);
    await cp(extractedRoot, sourceRoot, { recursive: true });
    await command('git', ['init'], { cwd: sourceRoot });
    await command('git', ['config', 'user.name', 'Easy PRD Testing Tests'], { cwd: sourceRoot });
    await command('git', ['config', 'user.email', 'tests@example.invalid'], { cwd: sourceRoot });
    await rewriteManagedVersion(sourceRoot, '0.1.1');
    await command('git', ['add', '-A'], { cwd: sourceRoot });
    await command('git', ['commit', '-m', 'v0.1.1'], { cwd: sourceRoot });
    await command('git', ['tag', 'v0.1.1'], { cwd: sourceRoot });
    await cp(extractedRoot, sourceRoot, { recursive: true, force: true });
    await command('git', ['add', '-A'], { cwd: sourceRoot });
    await command('git', ['commit', '-m', 'v0.1.2'], { cwd: sourceRoot });
    await command('git', ['tag', 'v0.1.2'], { cwd: sourceRoot });
    const cleanBuildRoot = await temporaryDirectory('clean-build');
    const cleanBuild = await buildReleasePackage({
        root: sourceRoot,
        outputDir: cleanBuildRoot,
        tag: 'v0.1.2',
    });
    assert.equal(cleanBuild.metadata.localDigest, build.metadata.localDigest);
    await command('git', ['remote', 'add', 'origin', bareRoot], { cwd: sourceRoot });
    await command('git', ['push', 'origin', '--tags', 'HEAD'], { cwd: sourceRoot });
    await command('git', ['clone', '--branch', 'v0.1.1', bareRoot, gitInstall]);

    const gitServer = await fixtureServer(archive, build.metadata);
    try {
        const manifestUrl = `${gitServer.baseUrl}/latest.json`;
        const checked = await checkForUpdate({
            root: gitInstall,
            manifestUrl,
            allowTestUrls: true,
            allowTestGitOrigin: bareRoot,
        });
        assert.equal(checked.installType, 'git');
        const updated = await performUpgrade({
            root: gitInstall,
            manifestUrl,
            allowTestUrls: true,
            allowTestGitOrigin: bareRoot,
            targetVersion: checked.targetVersion,
            expectedDigest: checked.expectedDigest,
            expectedStateDigest: checked.localStateDigest,
            confirmed: true,
        });
        assert.equal(updated.currentVersion, '0.1.2');
        const branch = await command('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], { cwd: gitInstall }).catch(() => null);
        assert.equal(branch, null);
        await writeFile(join(gitInstall, 'dirty.txt'), 'dirty\n');
        const dirty = await detectInstallation(gitInstall, { allowTestGitOrigin: bareRoot });
        assert.equal(dirty.changes.length, 1);
    } finally {
        await gitServer.close();
    }

    process.stdout.write('Self-update tests passed.\n');
}

run()
    .finally(async () => {
        for (const root of temporaryRoots.reverse()) {
            await rm(root, { recursive: true, force: true }).catch(() => {});
        }
    })
    .catch((error) => {
        process.stderr.write(`${error.stack ?? error.message}\n`);
        process.exitCode = 1;
    });
