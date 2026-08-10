#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXPORT_SCRIPT = join(REPO_ROOT, 'skills/xmind-export/scripts/export_test_cases.mjs');
const HEADERS = [
    '用例编号',
    '优先级',
    '执行目录',
    '模块',
    '场景',
    '前置条件',
    '测试步骤',
    '预期结果',
    '是否字段比对',
    '是否可能触发视频',
];

function table(headers, rows) {
    return [
        `| ${headers.join(' | ')} |`,
        `| ${headers.map(() => '---').join(' | ')} |`,
        ...rows.map((row) => `| ${row.join(' | ')} |`),
    ].join('\n');
}

function runExport(inputPath, options = {}) {
    return new Promise((resolvePromise, rejectPromise) => {
        const args = [EXPORT_SCRIPT, '--input', inputPath];
        if (options.force) args.push('--force');
        const child = spawn(process.execPath, args, {
            cwd: options.cwd ?? REPO_ROOT,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', (chunk) => { stdout += chunk; });
        child.stderr.on('data', (chunk) => { stderr += chunk; });
        child.on('error', rejectPromise);
        child.on('close', (code) => {
            try {
                resolvePromise({ code, stderr, payload: JSON.parse(stdout) });
            } catch (error) {
                rejectPromise(new Error(`Invalid JSON output: ${stdout}\n${stderr}\n${error.message}`));
            }
        });
    });
}

function hash(buffer) {
    return createHash('sha256').update(buffer).digest('hex');
}

function readZip(buffer) {
    let eocd = -1;
    for (let index = buffer.length - 22; index >= 0; index -= 1) {
        if (buffer.readUInt32LE(index) === 0x06054b50) {
            eocd = index;
            break;
        }
    }
    assert.notEqual(eocd, -1, 'XMind must be a ZIP archive');
    const count = buffer.readUInt16LE(eocd + 10);
    let position = buffer.readUInt32LE(eocd + 16);
    const files = new Map();
    for (let index = 0; index < count; index += 1) {
        assert.equal(buffer.readUInt32LE(position), 0x02014b50);
        const compression = buffer.readUInt16LE(position + 10);
        const size = buffer.readUInt32LE(position + 20);
        const nameLength = buffer.readUInt16LE(position + 28);
        const extraLength = buffer.readUInt16LE(position + 30);
        const commentLength = buffer.readUInt16LE(position + 32);
        const localOffset = buffer.readUInt32LE(position + 42);
        const name = buffer.toString('utf8', position + 46, position + 46 + nameLength);
        const localNameLength = buffer.readUInt16LE(localOffset + 26);
        const localExtraLength = buffer.readUInt16LE(localOffset + 28);
        const start = localOffset + 30 + localNameLength + localExtraLength;
        const compressed = buffer.subarray(start, start + size);
        files.set(name, compression === 8 ? inflateRawSync(compressed) : compressed);
        position += 46 + nameLength + extraLength + commentLength;
    }
    return files;
}

function workbook(buffer) {
    const files = readZip(buffer);
    for (const filename of ['content.json', 'metadata.json', 'manifest.json']) {
        assert(files.has(filename), `${filename} must exist`);
        JSON.parse(files.get(filename).toString('utf8'));
    }
    const sheets = JSON.parse(files.get('content.json').toString('utf8'));
    assert.equal(sheets.length, 1);
    return sheets[0];
}

function children(topic) {
    return topic?.children?.attached ?? [];
}

function findTopic(topic, title) {
    if (topic?.title === title) return topic;
    for (const child of children(topic)) {
        const found = findTopic(child, title);
        if (found) return found;
    }
    return null;
}

async function testCanonicalAndAutomaticUpdate(testRoot) {
    const moduleDir = join(testRoot, 'standalone', '订单管理');
    await mkdir(moduleDir, { recursive: true });
    const featurePath = join(moduleDir, '01-模块拆解.md');
    const casePath = join(moduleDir, '02-测试用例.md');
    const outputPath = join(moduleDir, '02-测试用例.xmind');
    await writeFile(featurePath, table(
        ['功能编号', '功能点'],
        [
            ['F-001', '创建订单'],
            ['F-002', '查看详情'],
            ['F-003', '取消订单'],
        ],
    ), 'utf8');
    const validRows = [
        [
            'ORD-P0-001', 'P0', '执行结果/P0/', '订单列表', 'F-001 **创建订单成功**',
            '已登录<br>具有创建权限', '1. 点击 `新建` 2. 查看[接口文档](https://example.test/api)',
            '1. 创建成功<br/>2. 状态为 A \\| B', '是', '是',
        ],
        [
            'ORD-P1-001', 'P1', '执行结果/P1/', '订单详情', 'F-002 查看订单详情',
            '订单已存在', '打开详情页', '展示订单字段', '否', '否',
        ],
    ];
    const validMarkdown = `# 测试用例\n\n${table(HEADERS, validRows)}\n`;
    await writeFile(casePath, validMarkdown, 'utf8');
    const sourceHashBefore = hash(await readFile(casePath));

    const created = await runExport('standalone/订单管理', { cwd: testRoot });
    assert.equal(created.code, 0);
    assert.equal(created.payload.status, 'created');
    assert.equal(created.payload.caseCount, 2);
    assert.equal(created.payload.normalization.defaultedFields, 0);
    assert(created.payload.warnings.some((entry) => entry.featureId === 'F-003'));
    assert.equal(hash(await readFile(casePath)), sourceHashBefore, 'export must not modify source Markdown');

    const sheet = workbook(await readFile(outputPath));
    assert.equal(sheet.title, '订单管理-测试用例');
    const root = sheet.rootTopic;
    assert.deepEqual(children(root).map((topic) => topic.title), [
        'P0（1）', 'P1（1）', 'P2（0）', 'P3（0）',
    ]);
    const firstCase = findTopic(root, 'ORD-P0-001｜F-001 创建订单成功');
    assert(firstCase);
    assert.deepEqual(firstCase.labels, ['F-001', '字段比对', '视频证据']);
    assert(findTopic(firstCase, '2. 查看接口文档（https://example.test/api）'));
    assert(findTopic(firstCase, '2. 状态为 A | B'));

    const upToDate = await runExport(casePath);
    assert.equal(upToDate.code, 0);
    assert.equal(upToDate.payload.status, 'up-to-date');

    const originalOutputHash = hash(await readFile(outputPath));
    const changedMarkdown = validMarkdown.replace('展示订单字段', '展示完整订单字段');
    await writeFile(casePath, changedMarkdown, 'utf8');
    const changedSourceHash = hash(await readFile(casePath));
    const updated = await runExport(casePath);
    assert.equal(updated.code, 0);
    assert.equal(updated.payload.status, 'updated');
    assert.equal(updated.payload.reason, 'source-changed');
    assert.equal(updated.payload.backupPath, null);
    assert.notEqual(hash(await readFile(outputPath)), originalOutputHash);
    assert.equal(hash(await readFile(casePath)), changedSourceHash, 'automatic update must not modify source');
}

async function testLegacyMultipleTables(testRoot) {
    const moduleDir = join(testRoot, 'legacy', '达人分时统计');
    await mkdir(moduleDir, { recursive: true });
    const casePath = join(moduleDir, 'legacy-cases.md');
    const outputPath = join(moduleDir, 'legacy-cases.xmind');
    const markdown = [
        '# 旧格式用例',
        '',
        '## P0 用例',
        '',
        table(
            ['用例ID', '模块', '场景', '前置条件', '操作/校验', '预期'],
            [['STAR-H-P0-001', '新表', '表结构校验', '测试库已部署', '核对字段', '字段完整']],
        ),
        '',
        '## P1 用例',
        '',
        table(
            ['用例ID', '模块', '场景', '校验点', '预期'],
            [['STAR-H-P1-001', '首页筛选', '数据类型切换', '切换三个选项', '卡片刷新']],
        ),
        '',
        '## P2 回归用例',
        '',
        table(
            ['用例ID', '模块', '场景', '预期'],
            [['STAR-H-P2-001', '首页', '信息流维度回归', '原有功能正常']],
        ),
        '',
        '## 缺陷判定',
        '',
        table(
            ['缺陷编号建议', '严重级别', '判定标准'],
            [['DEF-P0-001', 'P0', '核心统计失败']],
        ),
        '',
    ].join('\n');
    await writeFile(casePath, markdown, 'utf8');
    const sourceHash = hash(await readFile(casePath));

    const result = await runExport(casePath);
    assert.equal(result.code, 0);
    assert.equal(result.payload.status, 'created');
    assert.equal(result.payload.caseCount, 3);
    assert.equal(result.payload.outputPath, outputPath);
    assert.equal(result.payload.normalization.skippedTables, 1);
    assert(result.payload.normalization.defaultedFields > 0);
    assert(result.payload.warnings.some((entry) => entry.code === 'feature-source-missing'));
    assert.equal(hash(await readFile(casePath)), sourceHash, 'legacy export must leave Markdown unchanged');

    const root = workbook(await readFile(outputPath)).rootTopic;
    assert.deepEqual(children(root).map((topic) => topic.title), [
        'P0（1）', 'P1（1）', 'P2（1）', 'P3（0）',
    ]);
    assert(findTopic(root, 'STAR-H-P0-001｜表结构校验'));
    assert(findTopic(root, 'STAR-H-P1-001｜数据类型切换'));
    assert(findTopic(root, 'STAR-H-P2-001｜信息流维度回归'));
}

async function testIncompleteRowsAndWarnings(testRoot) {
    const moduleDir = join(testRoot, 'incomplete');
    await mkdir(moduleDir, { recursive: true });
    const casePath = join(moduleDir, 'cases.markdown');
    await writeFile(casePath, [
        '# 待补充用例',
        '',
        table(
            ['用例名称', '测试步骤', '预期'],
            [['', '点击登录', '']],
        ),
        '',
        '## P2 用例',
        '',
        table(
            ['用例ID', '优先级', '场景', '预期'],
            [['CASE-P0-002', 'P1', '优先级冲突', '以显式列为准']],
        ),
        '',
    ].join('\n'), 'utf8');

    const result = await runExport(casePath);
    assert.equal(result.code, 0);
    assert.equal(result.payload.status, 'created');
    assert.equal(result.payload.caseCount, 2);
    assert.equal(result.payload.normalization.autoGeneratedIds, 1);
    assert.equal(result.payload.normalization.unclassifiedCases, 1);
    assert(result.payload.normalization.defaultedFields >= 5);
    assert(result.payload.warnings.some((entry) => (
        entry.code === 'priority-conflict' && entry.selectedPriority === 'P1'
    )));

    const root = workbook(await readFile(join(moduleDir, 'cases.xmind'))).rootTopic;
    assert.deepEqual(children(root).map((topic) => topic.title), [
        'P0（0）', 'P1（1）', 'P2（0）', 'P3（0）', '未分级（1）',
    ]);
    const autoCase = findTopic(root, 'AUTO-UNCLASSIFIED-001｜待补充');
    assert(autoCase);
    assert(autoCase.labels.includes('待补充'));
    assert(findTopic(autoCase, '1. 待补充'));
    assert(findTopic(root, 'CASE-P0-002｜优先级冲突'));
}

async function testOptionalFeaturesAreWarnings(testRoot) {
    const moduleDir = join(testRoot, 'feature-warnings');
    await mkdir(moduleDir, { recursive: true });
    await writeFile(join(moduleDir, '01-模块拆解.md'), table(
        ['功能编号', '功能点'],
        [['F-001', '已知功能']],
    ), 'utf8');
    const casePath = join(moduleDir, '02-测试用例.md');
    await writeFile(casePath, table(
        ['用例ID', '场景', '预期'],
        [['CASE-P0-001', 'F-999 未知功能', '操作成功']],
    ), 'utf8');

    const result = await runExport(casePath);
    assert.equal(result.code, 0);
    assert.equal(result.payload.status, 'created');
    assert(result.payload.warnings.some((entry) => entry.code === 'unknown-feature-reference'));
    assert(result.payload.warnings.some((entry) => entry.code === 'feature-without-test-case'));
}

async function testUnmanagedBackup(testRoot) {
    const moduleDir = join(testRoot, 'backup');
    await mkdir(moduleDir, { recursive: true });
    const casePath = join(moduleDir, '02-测试用例.md');
    const outputPath = join(moduleDir, '02-测试用例.xmind');
    await writeFile(casePath, table(
        ['用例ID', '场景', '预期'],
        [['BACKUP-P0-001', '生成文件', '生成成功']],
    ), 'utf8');
    await writeFile(outputPath, 'manual-xmind-content', 'utf8');

    const first = await runExport(casePath);
    assert.equal(first.code, 0);
    assert.equal(first.payload.status, 'updated');
    assert.equal(first.payload.reason, 'unmanaged-target');
    assert.equal(first.payload.backupPath, `${outputPath}.bak`);
    assert.equal(await readFile(`${outputPath}.bak`, 'utf8'), 'manual-xmind-content');
    workbook(await readFile(outputPath));

    await writeFile(outputPath, 'second-manual-content', 'utf8');
    const second = await runExport(casePath);
    assert.equal(second.code, 0);
    assert.equal(second.payload.backupPath, `${outputPath}.bak.1`);
    assert.equal(await readFile(`${outputPath}.bak.1`, 'utf8'), 'second-manual-content');
}

async function testHardStops(testRoot) {
    const noCasesDir = join(testRoot, 'no-cases');
    await mkdir(noCasesDir, { recursive: true });
    const notesPath = join(noCasesDir, 'notes.md');
    await writeFile(notesPath, table(
        ['风险', '等级', '原因'],
        [['数据风险', 'P1', '依赖测试数据']],
    ), 'utf8');
    const noCases = await runExport(notesPath);
    assert.equal(noCases.code, 1);
    assert.equal(noCases.payload.status, 'error');
    assert(noCases.payload.errors.some((entry) => entry.code === 'no-test-case-table'));

    const ambiguousDir = join(testRoot, 'ambiguous');
    await mkdir(ambiguousDir, { recursive: true });
    const simpleCaseTable = table(
        ['用例ID', '场景', '预期'],
        [['CASE-P0-001', '场景', '成功']],
    );
    await writeFile(join(ambiguousDir, 'a.md'), simpleCaseTable, 'utf8');
    await writeFile(join(ambiguousDir, 'b.md'), simpleCaseTable, 'utf8');
    const ambiguous = await runExport(ambiguousDir);
    assert.equal(ambiguous.code, 1);
    assert(ambiguous.payload.errors.some((entry) => entry.code === 'ambiguous-input'));
}

async function main() {
    const testRoot = await mkdtemp(join(tmpdir(), 'easy-prd-xmind-test-'));
    try {
        await testCanonicalAndAutomaticUpdate(testRoot);
        await testLegacyMultipleTables(testRoot);
        await testIncompleteRowsAndWarnings(testRoot);
        await testOptionalFeaturesAreWarnings(testRoot);
        await testUnmanagedBackup(testRoot);
        await testHardStops(testRoot);
        process.stdout.write('XMind export tests passed.\n');
    } finally {
        await rm(testRoot, { recursive: true, force: true });
    }
}

await main();
