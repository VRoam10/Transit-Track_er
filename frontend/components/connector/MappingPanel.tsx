'use client';

import { ChevronDown, ChevronUp, X } from 'lucide-react';
import {
    FieldMapping,
    MappingSpec,
    Op,
    ResourceKind,
    TargetDiag,
    flattenTargetPaths,
} from '@/lib/connectorDefinition';
import OpEditor from './OpEditor';

type Props = {
    kind: ResourceKind;
    mapping: MappingSpec;
    sourcePaths: string[];
    diagnostics: Record<string, TargetDiag>;
    onChange: (m: MappingSpec) => void;
};

const inputClass =
    'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white';
const smallInputClass =
    'px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const iconBtnClass =
    'p-1 rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent';

const SOURCE_DATALIST_ID = 'mapping-panel-source-paths';

const OP_TYPES: Op['op'][] = [
    'default', 'const', 'toInt', 'toFloat', 'toString', 'toBool',
    'parseDate', 'formatDate', 'coalesce', 'concat', 'prefix', 'suffix',
    'lookup', 'round', 'multiply',
];

const TYPE_BADGE: Record<string, string> = {
    String: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700',
    Int: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700',
    Float: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900 dark:text-teal-300 dark:border-teal-700',
    Boolean: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700',
    Datetime: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900 dark:text-indigo-300 dark:border-indigo-700',
};

const STATUS_BADGE: Record<TargetDiag['status'], string> = {
    ok: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700',
    missing: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-700',
    wrongType: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700',
    error: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700',
};

const STATUS_TEXT: Record<TargetDiag['status'], string> = {
    ok: 'text-green-600 dark:text-green-400',
    missing: 'text-amber-600 dark:text-amber-400',
    wrongType: 'text-red-600 dark:text-red-400',
    error: 'text-red-600 dark:text-red-400',
};

const STATUS_LABEL: Record<TargetDiag['status'], string> = {
    ok: 'OK', missing: 'Missing', wrongType: 'Wrong type', error: 'Error',
};

/** Builds the default-shaped `Op` for a freshly added pipeline step. */
function defaultOpForType(type: Op['op']): Op {
    switch (type) {
        case 'default': return { op: 'default', value: '' };
        case 'const': return { op: 'const', value: '' };
        case 'toInt': return { op: 'toInt' };
        case 'toFloat': return { op: 'toFloat' };
        case 'toString': return { op: 'toString' };
        case 'toBool': return { op: 'toBool' };
        case 'parseDate': return { op: 'parseDate', from: 'unix' };
        case 'formatDate': return { op: 'formatDate', to: 'iso' };
        case 'coalesce': return { op: 'coalesce', paths: [] };
        case 'concat': return { op: 'concat', parts: [] };
        case 'prefix': return { op: 'prefix', value: '' };
        case 'suffix': return { op: 'suffix', value: '' };
        case 'lookup': return { op: 'lookup', map: {} };
        case 'round': return { op: 'round', decimals: 0 };
        case 'multiply': return { op: 'multiply', by: 1 };
        default: {
            const _exhaustive: never = type;
            return _exhaustive;
        }
    }
}

/**
 * Replaces/inserts the field for `target` and drops any field whose target
 * isn't a known compliance path — always returns a brand-new array.
 */
function rebuildFields(fields: FieldMapping[], knownPaths: Set<string>, target: string, next: FieldMapping): FieldMapping[] {
    const kept = fields.filter((f) => knownPaths.has(f.target));
    const index = kept.findIndex((f) => f.target === target);
    if (index === -1) return [...kept, next];
    return kept.map((f, i) => (i === index ? next : f));
}

/** Add/remove/reorder editor for a field's `ops` pipeline. */
function OpsPipeline({ ops, onChange }: { ops: Op[]; onChange: (ops: Op[]) => void }) {
    const updateOp = (index: number, next: Op) => onChange(ops.map((o, i) => (i === index ? next : o)));
    const removeOp = (index: number) => onChange(ops.filter((_, i) => i !== index));
    const moveOp = (index: number, dir: -1 | 1) => {
        const target = index + dir;
        if (target < 0 || target >= ops.length) return;
        const next = [...ops];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };
    const addOp = (type: Op['op']) => onChange([...ops, defaultOpForType(type)]);

    return (
        <div className="space-y-2">
            {ops.map((op, index) => (
                <div
                    key={index}
                    className="flex items-start gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2"
                >
                    <span className="text-xs font-mono font-semibold text-gray-500 dark:text-gray-400 pt-1 w-16 shrink-0">{op.op}</span>
                    <div className="flex-1 min-w-0">
                        <OpEditor op={op} onChange={(next) => updateOp(index, next)} />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            type="button"
                            className={iconBtnClass}
                            disabled={index === 0}
                            onClick={() => moveOp(index, -1)}
                            aria-label="Move op up"
                        >
                            <ChevronUp size={14} />
                        </button>
                        <button
                            type="button"
                            className={iconBtnClass}
                            disabled={index === ops.length - 1}
                            onClick={() => moveOp(index, 1)}
                            aria-label="Move op down"
                        >
                            <ChevronDown size={14} />
                        </button>
                        <button
                            type="button"
                            className={`${iconBtnClass} hover:text-red-500 dark:hover:text-red-400`}
                            onClick={() => removeOp(index)}
                            aria-label="Remove op"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            ))}
            <select
                value=""
                onChange={(e) => e.target.value && addOp(e.target.value as Op['op'])}
                className={`${smallInputClass} text-xs text-gray-500 dark:text-gray-400`}
                aria-label="Add op"
            >
                <option value="">+ add op</option>
                {OP_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </select>
        </div>
    );
}

/** One compliance-target row: source path + ops pipeline, or a JSONata `expr`, plus its diagnostic badge. */
function MappingRow({
    path,
    type,
    optional,
    field,
    diag,
    onChange,
}: {
    path: string;
    type: string;
    optional: boolean;
    field: FieldMapping | undefined;
    diag: TargetDiag | undefined;
    onChange: (next: FieldMapping) => void;
}) {
    const current = field ?? { target: path };
    const isAdvanced = current.expr !== undefined;
    const ops = current.ops ?? [];

    const toggleAdvanced = () => {
        if (isAdvanced) onChange({ target: path, source: current.source ?? '', ops: current.ops ?? [] });
        else onChange({ target: path, expr: current.expr ?? '' });
    };

    return (
        <div className="px-6 py-4 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                    <code className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-200 truncate">{path}</code>
                    <span
                        className={`text-xs px-2 py-0.5 rounded border font-bold ${
                            TYPE_BADGE[type] ?? 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                        }`}
                    >
                        {type}
                    </span>
                    {optional && (
                        <span className="text-xs px-2 py-0.5 rounded border font-bold bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600">
                            optional
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {diag && (
                        <span
                            className={`text-xs px-2 py-0.5 rounded border font-bold ${STATUS_BADGE[diag.status]}`}
                            title={diag.detail ?? STATUS_LABEL[diag.status]}
                        >
                            {STATUS_LABEL[diag.status]}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={toggleAdvanced}
                        className={`text-xs font-semibold px-2 py-1 rounded-lg border transition ${
                            isAdvanced
                                ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                        {isAdvanced ? 'expr' : 'advanced (expr)'}
                    </button>
                </div>
            </div>

            {diag?.detail && <p className={`text-xs ${STATUS_TEXT[diag.status]}`}>{diag.detail}</p>}

            {isAdvanced ? (
                <textarea
                    className={`${inputClass} font-mono text-xs`}
                    rows={2}
                    placeholder="JSONata expression, e.g. $substring(id, 0, 4)"
                    value={current.expr ?? ''}
                    onChange={(e) => onChange({ target: path, expr: e.target.value })}
                />
            ) : (
                <div className="space-y-2">
                    <input
                        type="text"
                        list={SOURCE_DATALIST_ID}
                        className={`${inputClass} font-mono`}
                        placeholder="source.path"
                        value={current.source ?? ''}
                        onChange={(e) => onChange({ target: path, source: e.target.value, ops })}
                    />
                    <OpsPipeline ops={ops} onChange={(nextOps) => onChange({ target: path, source: current.source ?? '', ops: nextOps })} />
                </div>
            )}
        </div>
    );
}

/**
 * Editor for a connector's `MappingSpec` — one row per compliance target
 * (from `flattenTargetPaths(kind)`), each authored via a source path + ops
 * pipeline or a JSONata `expr`. Fully controlled — every edit rebuilds
 * `mapping.fields` immutably and calls `onChange`; fields for targets that
 * aren't in the current compliance schema are dropped on every rebuild.
 */
export default function MappingPanel({ kind, mapping, sourcePaths, diagnostics, onChange }: Props) {
    const targets = flattenTargetPaths(kind);
    const knownPaths = new Set(targets.map((t) => t.path));

    const commitField = (path: string, next: FieldMapping) => {
        onChange({ fields: rebuildFields(mapping.fields, knownPaths, path, next) });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <datalist id={SOURCE_DATALIST_ID}>
                {sourcePaths.map((p) => (
                    <option key={p} value={p} />
                ))}
            </datalist>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Field mapping</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Map each compliance target from a source path (with an ops pipeline) or a JSONata expression
                </p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {targets.map((t) => (
                    <MappingRow
                        key={t.path}
                        path={t.path}
                        type={t.type}
                        optional={t.optional}
                        field={mapping.fields.find((f) => f.target === t.path)}
                        diag={diagnostics[t.path]}
                        onChange={(next) => commitField(t.path, next)}
                    />
                ))}
                {targets.length === 0 && (
                    <p className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">No compliance targets defined for this resource.</p>
                )}
            </div>
        </div>
    );
}
