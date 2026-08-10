#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
    access,
    readdir,
    readFile,
    rename,
    stat,
    unlink,
} from 'node:fs/promises';
import { constants as fsConstants, existsSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const UNCLASSIFIED = 'UNCLASSIFIED';
const PRIORITY_MARKERS = {
    P0: 'priority-1',
    P1: 'priority-2',
    P2: 'priority-3',
    P3: 'priority-4',
};
const COLUMN_ALIASES = {
    id: ['用例编号', '用例ID', '用例 Id', 'ID', 'Case ID', 'Test Case ID'],
    priority: ['优先级', '优先级别', 'Priority'],
    executionDirectory: ['执行目录', '结果目录'],
    module: ['模块', '功能模块', '所属模块'],
    scenario: ['场景', '用例名称', '测试点', '测试场景', '标题'],
    preconditions: ['前置条件', '前提条件'],
    steps: ['测试步骤', '操作/校验', '校验点', '步骤', '操作步骤'],
    expectedResults: ['预期结果', '预期', '期望结果'],
    fieldComparison: ['是否字段比对', '字段比对'],
    videoEvidence: ['是否可能触发视频', '是否视频', '视频证据'],
};
const DETECTION_GROUPS = ['id', 'scenario', 'steps', 'expectedResults'];
const FEATURE_ID_RE = /(?<![A-Za-z0-9])F-\d{3}(?!\d)/g;
const EXPORTER_VERSION = 'easy-prd-testing/xmind-export@2';
const SOURCE_HASH_PREFIX = '源文件 SHA-256：';
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CREATOR_SCRIPT = join(SCRIPT_DIR, 'create_xmind.mjs');

class ExportError extends Error {
    constructor(message, issues = []) {
        super(message);
        this.name = 'ExportError';
        this.issues = issues.length > 0 ? issues : [{ code: 'export-error', message }];
    }
}

function issue(code, message, details = {}) {
    return { code, message, ...details };
}

function parseArgs(argv) {
    let input;
    let force = false;

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--input') {
            input = argv[index + 1];
            index += 1;
        } else if (arg === '--force') {
            force = true;
        } else if (arg === '--help' || arg === '-h') {
            return { help: true };
        } else {
            throw new ExportError(`Unknown argument: ${arg}`, [
                issue('unknown-argument', `Unknown argument: ${arg}`),
            ]);
        }
    }

    if (!input) {
        throw new ExportError('Missing required --input argument.', [
            issue('missing-input', 'Provide --input with a Markdown file or module directory.'),
        ]);
    }

    return { input, force, help: false };
}

function printHelp() {
    process.stdout.write([
        'Usage:',
        '  node export_test_cases.mjs --input <markdown-file-or-module-directory> [--force]',
        '',
        'Relative paths, non-standard Markdown filenames, legacy columns, and multiple case tables are supported.',
        'The XMind file is written beside the selected Markdown source using the same basename.',
        '--force is accepted for backward compatibility but is no longer required.',
        '',
    ].join('\n'));
}

function emit(payload) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function sha256(buffer) {
    return createHash('sha256').update(buffer).digest('hex');
}

function splitTableRow(line) {
    let value = line.trim();
    if (value.startsWith('|')) value = value.slice(1);
    if (value.endsWith('|') && !value.endsWith('\\|')) value = value.slice(0, -1);

    const cells = [];
    let current = '';
    let escaped = false;
    for (const char of value) {
        if (escaped) {
            if (char === '|') current += '|';
            else current += `\\${char}`;
            escaped = false;
        } else if (char === '\\') {
            escaped = true;
        } else if (char === '|') {
            cells.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    if (escaped) current += '\\';
    cells.push(current.trim());
    return cells;
}

function isDelimiterRow(cells) {
    return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function decodeHtmlEntities(value) {
    const named = {
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
        '#39': "'",
    };
    return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|#39);/gi, (match, entity) => {
        const lower = entity.toLowerCase();
        if (lower.startsWith('#x')) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
        if (lower.startsWith('#')) return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
        return named[lower] ?? match;
    });
}

function normalizePresentation(value) {
    return decodeHtmlEntities(value)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1（$2）')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .trim();
}

function normalizeScalar(value) {
    return normalizePresentation(value).replace(/\s*\n\s*/g, ' ').trim();
}

function normalizeHeader(value) {
    return normalizeScalar(value).replace(/\s+/g, ' ').toLowerCase();
}

const HEADER_LOOKUP = new Map(Object.entries(COLUMN_ALIASES).flatMap(([field, aliases]) => (
    aliases.map((alias) => [normalizeHeader(alias), field])
)));

function extractTables(lines) {
    const tables = [];
    let heading = '';
    for (let index = 0; index < lines.length - 1; index += 1) {
        const headingMatch = lines[index].match(/^#{1,6}\s+(.+?)\s*$/);
        if (headingMatch) heading = normalizeScalar(headingMatch[1]);
        if (!lines[index].includes('|') || !lines[index + 1].includes('|')) continue;
        const headers = splitTableRow(lines[index]).map(normalizeScalar);
        const delimiter = splitTableRow(lines[index + 1]);
        if (!isDelimiterRow(delimiter)) continue;

        const rows = [];
        let rowIndex = index + 2;
        for (; rowIndex < lines.length; rowIndex += 1) {
            const rawLine = lines[rowIndex];
            if (!rawLine.trim() || !rawLine.includes('|')) break;
            const cells = splitTableRow(rawLine);
            const row = {};
            headers.forEach((header, columnIndex) => {
                row[header] = cells[columnIndex] ?? '';
            });
            rows.push({ row, line: rowIndex + 1 });
        }
        tables.push({ headers, rows, headerLine: index + 1, heading });
        index = rowIndex - 1;
    }
    return tables;
}

function mappedHeaders(headers) {
    const mapped = new Map();
    for (const header of headers) {
        const field = HEADER_LOOKUP.get(normalizeHeader(header));
        if (field && !mapped.has(field)) mapped.set(field, header);
    }
    return mapped;
}

function tableDetectionScore(table) {
    const mapped = mappedHeaders(table.headers);
    return DETECTION_GROUPS.filter((field) => mapped.has(field)).length;
}

function tableContainsCases(table) {
    return tableDetectionScore(table) >= 2;
}

function fieldValue(row, mapping, field, presentation = false) {
    const header = mapping.get(field);
    if (!header) return '';
    return presentation
        ? normalizePresentation(row[header] ?? '')
        : normalizeScalar(row[header] ?? '');
}

function extractFeatureIds(value) {
    return [...new Set(value.match(FEATURE_ID_RE) ?? [])];
}

function extractPriority(value) {
    const match = normalizeScalar(value).toUpperCase().match(/(?:^|[^A-Z0-9])(P[0-3])(?:$|[^A-Z0-9])/);
    return match?.[1] ?? null;
}

function normalizeBoolean(value, field, context, warnings, normalization) {
    const normalized = normalizeScalar(value).toLowerCase();
    if (!normalized) {
        normalization.defaultedFields += 1;
        warnings.push(issue('defaulted-field', `${field} is missing; defaulted to 否.`, {
            ...context,
            field,
            defaultValue: '否',
        }));
        return '否';
    }
    if (['是', 'yes', 'true', '1'].includes(normalized)) return '是';
    if (['否', 'no', 'false', '0'].includes(normalized)) return '否';
    normalization.defaultedFields += 1;
    warnings.push(issue('normalized-boolean', `${field} has an unrecognized value; defaulted to 否.`, {
        ...context,
        field,
        value,
        defaultValue: '否',
    }));
    return '否';
}

function defaultText(value, field, fallback, context, warnings, normalization) {
    if (value) return value;
    normalization.defaultedFields += 1;
    warnings.push(issue('defaulted-field', `${field} is missing; defaulted to ${fallback}.`, {
        ...context,
        field,
        defaultValue: fallback,
    }));
    return fallback;
}

function choosePriority(explicitValue, heading, caseId, context, warnings) {
    const explicitRaw = normalizeScalar(explicitValue);
    const explicit = extractPriority(explicitRaw);
    const fromHeading = extractPriority(heading);
    const fromId = extractPriority(caseId);
    let selected;

    if (explicitRaw) {
        selected = explicit ?? UNCLASSIFIED;
        if (!explicit) {
            warnings.push(issue('invalid-priority', 'Explicit priority is not P0-P3; placed under 未分级.', {
                ...context,
                field: '优先级',
                value: explicitRaw,
            }));
        }
    } else {
        selected = fromHeading ?? fromId ?? UNCLASSIFIED;
        if (selected === UNCLASSIFIED) {
            warnings.push(issue('unclassified-case', 'Priority could not be inferred; placed under 未分级.', context));
        }
    }

    const detected = [explicit, fromHeading, fromId].filter(Boolean);
    if (new Set(detected).size > 1) {
        warnings.push(issue('priority-conflict', 'Priority sources conflict; used explicit column, then heading, then case ID.', {
            ...context,
            selectedPriority: selected === UNCLASSIFIED ? '未分级' : selected,
            explicitPriority: explicit,
            headingPriority: fromHeading,
            caseIdPriority: fromId,
        }));
    }
    return selected;
}

function parseTestCases(markdown) {
    const tables = extractTables(markdown.split(/\r?\n/));
    const warnings = [];
    const normalization = {
        autoGeneratedIds: 0,
        defaultedFields: 0,
        skippedTables: 0,
        unclassifiedCases: 0,
    };
    const candidates = [];

    for (const table of tables) {
        if (tableContainsCases(table)) candidates.push(table);
        else if (table.rows.length > 0) {
            normalization.skippedTables += 1;
            warnings.push(issue('skipped-non-case-table', 'Skipped a table that does not look like a test-case table.', {
                line: table.headerLine,
                heading: table.heading || undefined,
                headers: table.headers,
            }));
        }
    }

    if (candidates.length === 0) {
        throw new ExportError('No recognizable Markdown test-case table was found.', [
            issue('no-test-case-table', 'Use a Markdown table matching at least two of: ID, scenario, steps, expected result.'),
        ]);
    }

    const cases = [];
    const seenIds = new Set();
    const autoCounters = new Map();
    for (const table of candidates) {
        const mapping = mappedHeaders(table.headers);
        for (const { row, line } of table.rows) {
            if (Object.values(row).every((value) => normalizeScalar(value) === '')) continue;
            const context = { line, heading: table.heading || undefined };
            const rawId = fieldValue(row, mapping, 'id');
            const priority = choosePriority(
                fieldValue(row, mapping, 'priority'),
                table.heading,
                rawId,
                context,
                warnings,
            );
            if (priority === UNCLASSIFIED) normalization.unclassifiedCases += 1;

            let caseId = rawId;
            let needsReview = false;
            if (!caseId) {
                const priorityCode = priority === UNCLASSIFIED ? 'UNCLASSIFIED' : priority;
                const next = (autoCounters.get(priorityCode) ?? 0) + 1;
                autoCounters.set(priorityCode, next);
                caseId = `AUTO-${priorityCode}-${String(next).padStart(3, '0')}`;
                normalization.autoGeneratedIds += 1;
                needsReview = true;
                warnings.push(issue('auto-generated-case-id', `Generated case ID ${caseId}.`, {
                    ...context,
                    field: '用例编号',
                    generatedValue: caseId,
                }));
            } else if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(caseId)) {
                warnings.push(issue('nonstandard-case-id', 'Case ID is non-standard but was preserved.', {
                    ...context,
                    caseId,
                    field: '用例编号',
                }));
            }

            if (seenIds.has(caseId)) {
                let suffix = 2;
                let uniqueId = `${caseId}-DUP${suffix}`;
                while (seenIds.has(uniqueId)) {
                    suffix += 1;
                    uniqueId = `${caseId}-DUP${suffix}`;
                }
                warnings.push(issue('duplicate-case-id', `Duplicate case ID ${caseId} was renamed to ${uniqueId} in XMind.`, {
                    ...context,
                    caseId,
                    generatedValue: uniqueId,
                }));
                caseId = uniqueId;
                needsReview = true;
            }
            seenIds.add(caseId);

            const expectedDirectory = priority === UNCLASSIFIED
                ? '执行结果/未分级/'
                : `执行结果/${priority}/`;
            let executionDirectory = fieldValue(row, mapping, 'executionDirectory');
            if (!executionDirectory) {
                executionDirectory = expectedDirectory;
                normalization.defaultedFields += 1;
            } else if (executionDirectory !== expectedDirectory) {
                warnings.push(issue('execution-directory-mismatch', 'Execution directory does not match the selected priority; preserved as provided.', {
                    ...context,
                    caseId,
                    field: '执行目录',
                    value: executionDirectory,
                    expectedValue: expectedDirectory,
                }));
            }

            const beforeDefaults = normalization.defaultedFields;
            const module = defaultText(
                fieldValue(row, mapping, 'module'),
                '模块',
                '未指定模块',
                { ...context, caseId },
                warnings,
                normalization,
            );
            const scenario = defaultText(
                fieldValue(row, mapping, 'scenario', true),
                '场景',
                '待补充',
                { ...context, caseId },
                warnings,
                normalization,
            );
            const preconditions = defaultText(
                fieldValue(row, mapping, 'preconditions', true),
                '前置条件',
                '待补充',
                { ...context, caseId },
                warnings,
                normalization,
            );
            const steps = defaultText(
                fieldValue(row, mapping, 'steps', true),
                '测试步骤',
                '待补充',
                { ...context, caseId },
                warnings,
                normalization,
            );
            const expectedResults = defaultText(
                fieldValue(row, mapping, 'expectedResults', true),
                '预期结果',
                '待补充',
                { ...context, caseId },
                warnings,
                normalization,
            );
            const fieldComparison = normalizeBoolean(
                fieldValue(row, mapping, 'fieldComparison'),
                '是否字段比对',
                { ...context, caseId },
                warnings,
                normalization,
            );
            const videoEvidence = normalizeBoolean(
                fieldValue(row, mapping, 'videoEvidence'),
                '是否可能触发视频',
                { ...context, caseId },
                warnings,
                normalization,
            );
            if (normalization.defaultedFields > beforeDefaults || priority === UNCLASSIFIED) needsReview = true;

            cases.push({
                line,
                id: caseId,
                priority,
                executionDirectory,
                module,
                scenario,
                preconditions,
                steps,
                expectedResults,
                fieldComparison,
                videoEvidence,
                featureIds: extractFeatureIds(`${caseId} ${scenario}`),
                needsReview,
            });
        }
    }

    if (cases.length === 0) {
        throw new ExportError('No test-case rows were found.', [
            issue('no-test-case-rows', 'Recognizable tables were found, but they contain no non-empty rows.'),
        ]);
    }
    return { cases, warnings, normalization };
}

function parseFeatures(markdown) {
    const warnings = [];
    const table = extractTables(markdown.split(/\r?\n/)).find((candidate) => (
        candidate.headers.includes('功能编号') && candidate.headers.includes('功能点')
    ));
    if (!table) {
        return {
            features: new Map(),
            warnings: [issue('feature-table-missing', 'No F-xxx feature table was found; exported without feature coverage validation.')],
        };
    }

    const features = new Map();
    for (const { row, line } of table.rows) {
        const id = normalizeScalar(row['功能编号'] ?? '');
        const name = normalizeScalar(row['功能点'] ?? '');
        if (!id && !name) continue;
        if (!/^F-\d{3}$/.test(id)) {
            warnings.push(issue('invalid-feature-id', 'Ignored a feature whose ID is not F-xxx.', {
                line,
                field: '功能编号',
                value: id,
            }));
            continue;
        }
        if (features.has(id)) {
            warnings.push(issue('duplicate-feature-id', `Ignored duplicate feature ID ${id}.`, {
                line,
                field: '功能编号',
                value: id,
            }));
            continue;
        }
        features.set(id, { id, name, line });
    }
    return { features, warnings };
}

function crossValidateFeatures(cases, features) {
    const warnings = [];
    const referenced = new Set();
    for (const testCase of cases) {
        for (const featureId of testCase.featureIds) {
            referenced.add(featureId);
            if (features.size > 0 && !features.has(featureId)) {
                warnings.push(issue('unknown-feature-reference', `Feature ${featureId} is not defined in the optional feature table.`, {
                    line: testCase.line,
                    caseId: testCase.id,
                    value: featureId,
                }));
            }
        }
    }
    if (features.size > 0) {
        for (const featureId of features.keys()) {
            if (!referenced.has(featureId)) {
                warnings.push(issue('feature-without-test-case', `Feature ${featureId} has no test-case coverage.`, {
                    featureId,
                }));
            }
        }
    }
    return warnings;
}

async function resolveInputPath(requestedPath) {
    const resolvedPath = resolve(requestedPath);
    let inputStats;
    try {
        inputStats = await stat(resolvedPath);
    } catch {
        throw new ExportError('Input path does not exist.', [
            issue('input-not-found', `Input path does not exist: ${resolvedPath}`, { field: 'input' }),
        ]);
    }

    if (inputStats.isFile()) {
        if (!['.md', '.markdown'].includes(extname(resolvedPath).toLowerCase())) {
            throw new ExportError('Input file is not Markdown.', [
                issue('input-not-markdown', 'The input file must use .md or .markdown.', { field: 'input' }),
            ]);
        }
        return resolvedPath;
    }
    if (!inputStats.isDirectory()) {
        throw new ExportError('Input must be a Markdown file or directory.', [
            issue('invalid-input-type', 'Input must be a Markdown file or module directory.', { field: 'input' }),
        ]);
    }

    const entries = await readdir(resolvedPath, { withFileTypes: true });
    const markdownFiles = entries
        .filter((entry) => entry.isFile() && ['.md', '.markdown'].includes(extname(entry.name).toLowerCase()))
        .map((entry) => join(resolvedPath, entry.name));
    const standard = markdownFiles.find((path) => basename(path) === '02-测试用例.md');
    if (standard) return standard;

    const namedCandidates = markdownFiles.filter((path) => /(?:测试用例|test[-_ ]?cases?)/i.test(basename(path)));
    const pool = namedCandidates.length > 0 ? namedCandidates : markdownFiles;
    const contentCandidates = [];
    for (const path of pool) {
        const markdown = await readFile(path, 'utf8');
        if (extractTables(markdown.split(/\r?\n/)).some(tableContainsCases)) contentCandidates.push(path);
    }
    if (contentCandidates.length === 1) return contentCandidates[0];
    if (contentCandidates.length > 1) {
        throw new ExportError('Multiple test-case Markdown candidates were found.', [
            issue('ambiguous-input', 'Provide the specific Markdown file to export.', {
                field: 'input',
                candidates: contentCandidates,
            }),
        ]);
    }
    throw new ExportError('No recognizable test-case Markdown file was found in the directory.', [
        issue('no-markdown-candidate', 'No Markdown file in the directory contains a recognizable test-case table.', {
            field: 'input',
        }),
    ]);
}

function splitExplicitItems(value) {
    const normalized = value.trim();
    if (!normalized) return [];

    const initialLines = normalized
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const items = [];

    for (const line of initialLines) {
        const matches = [...line.matchAll(/(?:^|\s)(\d+)[.)、]\s*/g)];
        if (matches.length >= 2 || (matches.length === 1 && matches[0].index === 0)) {
            for (let index = 0; index < matches.length; index += 1) {
                const start = matches[index].index + matches[index][0].length;
                const end = index + 1 < matches.length ? matches[index + 1].index : line.length;
                const item = line.slice(start, end).trim();
                if (item) items.push(item);
            }
        } else {
            const item = line.replace(/^(?:[-*+]\s+|\d+[.)、]\s*)/, '').trim();
            if (item) items.push(item);
        }
    }

    return items;
}

function detailBranch(title, value) {
    const items = splitExplicitItems(value);
    return {
        title,
        children: items.map((item, index) => ({ title: `${index + 1}. ${item}` })),
    };
}

function buildWorkbook(moduleName, cases, sourceHash, sourceFilename) {
    const priorityGroups = new Map([...PRIORITIES, UNCLASSIFIED].map((priority) => [priority, []]));
    for (const testCase of cases) priorityGroups.get(testCase.priority).push(testCase);

    const groupOrder = [...PRIORITIES];
    if (priorityGroups.get(UNCLASSIFIED).length > 0) groupOrder.push(UNCLASSIFIED);
    const priorityTopics = groupOrder.map((priority) => {
        const priorityCases = priorityGroups.get(priority);
        const modules = new Map();
        for (const testCase of priorityCases) {
            if (!modules.has(testCase.module)) modules.set(testCase.module, []);
            modules.get(testCase.module).push(testCase);
        }

        const topic = {
            title: priority === UNCLASSIFIED
                ? `未分级（${priorityCases.length}）`
                : `${priority}（${priorityCases.length}）`,
            children: [...modules.entries()].map(([caseModule, moduleCases]) => ({
                title: `${caseModule}（${moduleCases.length}）`,
                children: moduleCases.map((testCase) => {
                    const labels = [...testCase.featureIds];
                    if (testCase.fieldComparison === '是') labels.push('字段比对');
                    if (testCase.videoEvidence === '是') labels.push('视频证据');
                    if (testCase.needsReview) labels.push('待补充');
                    return {
                        title: `${testCase.id}｜${testCase.scenario}`,
                        labels,
                        children: [
                            detailBranch('前置条件', testCase.preconditions),
                            detailBranch('测试步骤', testCase.steps),
                            detailBranch('预期结果', testCase.expectedResults),
                            {
                                title: '元数据',
                                children: [
                                    { title: `执行目录：${testCase.executionDirectory}` },
                                    { title: `是否字段比对：${testCase.fieldComparison}` },
                                    { title: `是否可能触发视频：${testCase.videoEvidence}` },
                                ],
                            },
                        ],
                    };
                }),
            })),
        };
        if (priority !== UNCLASSIFIED) topic.markers = [PRIORITY_MARKERS[priority]];
        return topic;
    });

    const notes = [
        `来源文件：${sourceFilename}`,
        '权威声明：内容冲突时以 Markdown 为准',
        `导出器：${EXPORTER_VERSION}`,
        `${SOURCE_HASH_PREFIX}${sourceHash}`,
    ].join('\n');

    return {
        format: 'zen',
        sheets: [{
            title: `${moduleName}-测试用例`,
            rootTopic: {
                title: `${moduleName}测试用例（共 ${cases.length} 条）`,
                notes,
                structureClass: 'org.xmind.ui.logic.right',
                children: priorityTopics,
            },
        }],
    };
}

function readZip(buffer) {
    let eocdOffset = -1;
    for (let index = buffer.length - 22; index >= 0; index -= 1) {
        if (buffer.readUInt32LE(index) === 0x06054b50) {
            eocdOffset = index;
            break;
        }
    }
    if (eocdOffset === -1) throw new Error('Invalid ZIP: EOCD not found.');

    const entryCount = buffer.readUInt16LE(eocdOffset + 10);
    const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
    const files = new Map();
    let position = centralDirectoryOffset;

    for (let index = 0; index < entryCount; index += 1) {
        if (buffer.readUInt32LE(position) !== 0x02014b50) {
            throw new Error('Invalid ZIP: bad central directory entry.');
        }
        const compression = buffer.readUInt16LE(position + 10);
        const compressedSize = buffer.readUInt32LE(position + 20);
        const nameLength = buffer.readUInt16LE(position + 28);
        const extraLength = buffer.readUInt16LE(position + 30);
        const commentLength = buffer.readUInt16LE(position + 32);
        const localHeaderOffset = buffer.readUInt32LE(position + 42);
        const name = buffer.toString('utf8', position + 46, position + 46 + nameLength);

        const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
        const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
        const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
        const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
        let data;
        if (compression === 0) data = compressed;
        else if (compression === 8) data = inflateRawSync(compressed);
        else throw new Error(`Unsupported ZIP compression method: ${compression}.`);
        files.set(name, data);

        position += 46 + nameLength + extraLength + commentLength;
    }

    return files;
}

function parseXMind(buffer) {
    const files = readZip(buffer);
    for (const required of ['content.json', 'metadata.json', 'manifest.json']) {
        if (!files.has(required)) throw new Error(`Missing ${required} in XMind archive.`);
        JSON.parse(files.get(required).toString('utf8'));
    }
    const parsed = JSON.parse(files.get('content.json').toString('utf8'));
    const sheets = Array.isArray(parsed) ? parsed : parsed.sheets;
    if (!Array.isArray(sheets)) throw new Error('content.json does not contain a sheet array.');
    return sheets;
}

function attachedChildren(topic) {
    if (Array.isArray(topic?.children)) return topic.children;
    return topic?.children?.attached ?? [];
}

function topicNotes(topic) {
    if (typeof topic?.notes === 'string') return topic.notes;
    return topic?.notes?.plain?.content ?? '';
}

function traverseTopics(topic, visitor) {
    visitor(topic);
    for (const child of attachedChildren(topic)) traverseTopics(child, visitor);
}

function inspectExistingXMind(outputPath) {
    return readFile(outputPath)
        .then((buffer) => {
            const sheets = parseXMind(buffer);
            const root = sheets[0]?.rootTopic;
            const notes = topicNotes(root);
            const match = notes.match(new RegExp(`${SOURCE_HASH_PREFIX}([a-f0-9]{64})`));
            const exporterMatch = notes.match(/^\u5bfc\u51fa\u5668：(.+)$/m);
            return {
                sourceHash: match?.[1] ?? null,
                managed: Boolean(match),
                exporterVersion: exporterMatch?.[1]?.trim() ?? null,
            };
        })
        .catch(() => ({ sourceHash: null, managed: false, exporterVersion: null }));
}

function validateGeneratedXMind(buffer, moduleName, cases, sourceHash) {
    const problems = [];
    let sheets;
    try {
        sheets = parseXMind(buffer);
    } catch (error) {
        throw new ExportError('Generated XMind archive is invalid.', [
            issue('invalid-generated-xmind', error.message),
        ]);
    }

    if (sheets.length !== 1) {
        problems.push(issue('unexpected-sheet-count', 'Generated XMind must contain exactly one sheet.'));
    }
    const sheet = sheets[0];
    if (sheet?.title !== `${moduleName}-测试用例`) {
        problems.push(issue('unexpected-sheet-title', 'Generated sheet title does not match the module name.'));
    }
    const root = sheet?.rootTopic;
    if (root?.title !== `${moduleName}测试用例（共 ${cases.length} 条）`) {
        problems.push(issue('unexpected-root-title', 'Generated root title or case count is incorrect.'));
    }
    if (!topicNotes(root).includes(`${SOURCE_HASH_PREFIX}${sourceHash}`)) {
        problems.push(issue('missing-source-fingerprint', 'Generated root notes do not contain the source SHA-256.'));
    }

    const priorityTitles = attachedChildren(root).map((topic) => topic.title);
    for (const priority of PRIORITIES) {
        const count = cases.filter((testCase) => testCase.priority === priority).length;
        if (!priorityTitles.includes(`${priority}（${count}）`)) {
            problems.push(issue(
                'missing-priority-branch',
                `Generated XMind is missing ${priority}（${count}）.`,
            ));
        }
    }
    const unclassifiedCount = cases.filter((testCase) => testCase.priority === UNCLASSIFIED).length;
    if (unclassifiedCount > 0 && !priorityTitles.includes(`未分级（${unclassifiedCount}）`)) {
        problems.push(issue(
            'missing-unclassified-branch',
            `Generated XMind is missing 未分级（${unclassifiedCount}）.`,
        ));
    }

    const seenCases = new Map(cases.map((testCase) => [testCase.id, 0]));
    traverseTopics(root, (topic) => {
        for (const testCase of cases) {
            if (topic?.title === `${testCase.id}｜${testCase.scenario}`) {
                seenCases.set(testCase.id, seenCases.get(testCase.id) + 1);
            }
        }
    });
    for (const [caseId, count] of seenCases) {
        if (count !== 1) {
            problems.push(issue(
                'generated-case-count-mismatch',
                `Expected test case ${caseId} exactly once, found ${count}.`,
                { caseId },
            ));
        }
    }

    if (problems.length > 0) {
        throw new ExportError('Generated XMind validation failed.', problems);
    }
}

function runCreator(payload) {
    return new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(process.execPath, [CREATOR_SCRIPT], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', (chunk) => { stdout += chunk; });
        child.stderr.on('data', (chunk) => { stderr += chunk; });
        child.on('error', rejectPromise);
        child.on('close', (code) => {
            if (code === 0) resolvePromise({ stdout: stdout.trim(), stderr: stderr.trim() });
            else rejectPromise(new Error(stderr.trim() || stdout.trim() || `Creator exited with ${code}.`));
        });
        child.stdin.end(JSON.stringify(payload));
    });
}

function nextBackupPath(outputPath) {
    const base = `${outputPath}.bak`;
    if (!existsSync(base)) return base;
    let index = 1;
    while (existsSync(`${base}.${index}`)) index += 1;
    return `${base}.${index}`;
}

async function generateAtomically(outputPath, workbook, validationContext, backupExisting = false) {
    const temporaryPath = join(
        dirname(outputPath),
        `.${basename(outputPath, '.xmind')}.${process.pid}.${randomUUID()}.tmp.xmind`,
    );
    let backupPath;
    try {
        await runCreator({ ...workbook, path: temporaryPath });
        const buffer = await readFile(temporaryPath);
        validateGeneratedXMind(buffer, ...validationContext);
        if (backupExisting && existsSync(outputPath)) {
            backupPath = nextBackupPath(outputPath);
            await rename(outputPath, backupPath);
        }
        try {
            await rename(temporaryPath, outputPath);
        } catch (error) {
            if (backupPath && !existsSync(outputPath)) {
                await rename(backupPath, outputPath).catch(() => {});
            }
            throw error;
        }
        return backupPath;
    } finally {
        if (existsSync(temporaryPath)) await unlink(temporaryPath).catch(() => {});
    }
}

function summarizeWarnings(warnings, normalization) {
    return {
        total: warnings.length,
        autoGeneratedIds: normalization?.autoGeneratedIds ?? 0,
        defaultedFields: normalization?.defaultedFields ?? 0,
        skippedTables: normalization?.skippedTables ?? 0,
        unclassifiedCases: normalization?.unclassifiedCases ?? 0,
        unmatchedFeatureReferences: warnings.filter((entry) => entry.code === 'unknown-feature-reference').length,
    };
}

async function main() {
    const nodeMajor = Number.parseInt(process.versions.node.split('.')[0], 10);
    if (!Number.isInteger(nodeMajor) || nodeMajor < 18) {
        emit({
            status: 'error',
            errors: [issue(
                'unsupported-node-version',
                'xmind-export requires Node.js 18 or newer. Install Node.js and retry; the skill will not install it automatically.',
            )],
        });
        process.exitCode = 2;
        return;
    }

    let parsedArgs;
    try {
        parsedArgs = parseArgs(process.argv.slice(2));
    } catch (error) {
        emit({ status: 'error', errors: error.issues ?? [issue('argument-error', error.message)] });
        process.exitCode = 2;
        return;
    }

    if (parsedArgs.help) {
        printHelp();
        return;
    }

    let inputPath = resolve(parsedArgs.input);
    let outputPath;
    let featurePath;
    const warnings = [];
    let normalization;

    try {
        inputPath = await resolveInputPath(parsedArgs.input);
        const inputExtension = extname(inputPath);
        outputPath = join(dirname(inputPath), `${basename(inputPath, inputExtension)}.xmind`);
        const optionalFeaturePath = join(dirname(inputPath), '01-模块拆解.md');
        await access(inputPath, fsConstants.R_OK);
        const inputStats = await stat(inputPath);
        if (!inputStats.isFile()) {
            throw new ExportError('Resolved input is not a regular file.', [
                issue('invalid-input-type', 'Resolved test-case input must be a regular Markdown file.'),
            ]);
        }

        const sourceBuffer = await readFile(inputPath);
        const sourceHash = sha256(sourceBuffer);
        const parsedCases = parseTestCases(sourceBuffer.toString('utf8'));
        const { cases } = parsedCases;
        normalization = parsedCases.normalization;
        warnings.push(...parsedCases.warnings);

        let features = new Map();
        if (existsSync(optionalFeaturePath)) {
            const featureStats = await stat(optionalFeaturePath);
            if (featureStats.isFile()) {
                featurePath = optionalFeaturePath;
                const parsedFeatures = parseFeatures(await readFile(featurePath, 'utf8'));
                features = parsedFeatures.features;
                warnings.push(...parsedFeatures.warnings);
            } else {
                warnings.push(issue('feature-source-not-file', 'Optional 01-模块拆解.md is not a regular file; skipped feature validation.'));
            }
        } else {
            warnings.push(issue('feature-source-missing', 'Optional 01-模块拆解.md was not found; exported without feature coverage validation.'));
        }
        warnings.push(...crossValidateFeatures(cases, features));
        if (parsedArgs.force) {
            warnings.push(issue('force-no-longer-required', '--force is no longer required; managed outputs update automatically.'));
        }

        const targetExists = existsSync(outputPath);
        let existing = { sourceHash: null, managed: false, exporterVersion: null };
        let updateReason;
        if (targetExists) {
            const outputStats = await stat(outputPath);
            if (!outputStats.isFile()) {
                throw new ExportError('Output path is not a regular file.', [
                    issue('invalid-output-type', `Cannot replace non-file output path: ${outputPath}`),
                ]);
            }
            existing = await inspectExistingXMind(outputPath);
            if (existing.sourceHash === sourceHash && existing.exporterVersion === EXPORTER_VERSION) {
                try {
                    validateGeneratedXMind(
                        await readFile(outputPath),
                        basename(dirname(inputPath)),
                        cases,
                        sourceHash,
                    );
                } catch (error) {
                    updateReason = 'invalid-target';
                    warnings.push(issue('invalid-existing-target', 'Existing managed XMind failed structure validation and will be regenerated.', {
                        errors: error.issues ?? [issue('invalid-target', error.message)],
                    }));
                }
                if (!updateReason) {
                    emit({
                        status: 'up-to-date',
                        inputPath,
                        featurePath: featurePath ?? null,
                        outputPath,
                        moduleName: basename(dirname(inputPath)),
                        caseCount: cases.length,
                        sourceSha256: sourceHash,
                        normalization,
                        warningSummary: summarizeWarnings(warnings, normalization),
                        warnings,
                    });
                    return;
                }
            } else if (!existing.managed) {
                updateReason = 'unmanaged-target';
            } else if (existing.exporterVersion !== EXPORTER_VERSION) {
                updateReason = 'exporter-version-changed';
            } else {
                updateReason = 'source-changed';
            }
        }

        const moduleName = basename(dirname(inputPath));
        const workbook = buildWorkbook(moduleName, cases, sourceHash, basename(inputPath));
        const backupPath = await generateAtomically(
            outputPath,
            workbook,
            [moduleName, cases, sourceHash],
            targetExists && !existing.managed,
        );

        emit({
            status: targetExists ? 'updated' : 'created',
            reason: updateReason,
            inputPath,
            featurePath: featurePath ?? null,
            outputPath,
            backupPath: backupPath ?? null,
            moduleName,
            caseCount: cases.length,
            sourceSha256: sourceHash,
            normalization,
            warningSummary: summarizeWarnings(warnings, normalization),
            warnings,
        });
    } catch (error) {
        const errors = error instanceof ExportError
            ? error.issues
            : [issue('unexpected-error', error.message)];
        emit({
            status: 'error',
            inputPath,
            featurePath: featurePath ?? null,
            outputPath: outputPath ?? null,
            errors,
            normalization: normalization ?? null,
            warningSummary: summarizeWarnings(warnings, normalization),
            warnings,
        });
        process.exitCode = 1;
    }
}

await main();
