'use strict';
/**
 * Minimal JSON Schema checker for the project's own config files.
 *
 * Supports the subset used by src/schemas/*.schema.json: type, required,
 * properties, additionalProperties (boolean), items, enum, const, pattern,
 * minimum, maximum, minItems, maxItems, uniqueItems, minLength. Anything else
 * in a schema is ignored. Deliberately no dependency: wings.json is small and
 * ajv would be one more package in the deploy audit gate.
 *
 * @param {*} value
 * @param {Object} schema
 * @param {string} [at] - JSON pointer-ish path for messages
 * @returns {string[]} problems, empty when valid
 */
function validateSchema(value, schema, at = '$') {
    const problems = [];
    const fail = msg => problems.push(`${at}: ${msg}`);

    if (schema.const !== undefined && value !== schema.const) fail(`must equal ${JSON.stringify(schema.const)}`);
    if (schema.enum && !schema.enum.includes(value)) fail(`must be one of ${schema.enum.map(v => JSON.stringify(v)).join(', ')}; got ${JSON.stringify(value)}`);

    if (schema.type) {
        const types = [].concat(schema.type);
        if (!types.some(t => isType(value, t))) {
            fail(`must be ${types.join(' or ')}; got ${describe(value)}`);
            return problems; // shape checks below assume the right type
        }
    }

    if (isType(value, 'object') && (schema.properties || schema.required || schema.additionalProperties === false)) {
        for (const key of schema.required || []) {
            if (!(key in value)) fail(`missing required property "${key}"`);
        }
        for (const [key, sub] of Object.entries(schema.properties || {})) {
            if (key in value) problems.push(...validateSchema(value[key], sub, `${at}.${key}`));
        }
        if (schema.additionalProperties === false) {
            for (const key of Object.keys(value)) {
                if (!(schema.properties && key in schema.properties)) fail(`unknown property "${key}"`);
            }
        }
    }

    if (Array.isArray(value)) {
        if (schema.minItems !== undefined && value.length < schema.minItems) fail(`needs at least ${schema.minItems} items`);
        if (schema.maxItems !== undefined && value.length > schema.maxItems) fail(`allows at most ${schema.maxItems} items`);
        if (schema.uniqueItems && new Set(value.map(v => JSON.stringify(v))).size !== value.length) fail('items must be unique');
        if (schema.items) value.forEach((v, i) => problems.push(...validateSchema(v, schema.items, `${at}[${i}]`)));
    }

    if (typeof value === 'string') {
        if (schema.minLength !== undefined && value.length < schema.minLength) fail(`must be at least ${schema.minLength} characters`);
        if (schema.pattern && !new RegExp(schema.pattern).test(value)) fail(`must match /${schema.pattern}/; got ${JSON.stringify(value)}`);
    }

    if (typeof value === 'number') {
        if (schema.minimum !== undefined && value < schema.minimum) fail(`must be >= ${schema.minimum}`);
        if (schema.maximum !== undefined && value > schema.maximum) fail(`must be <= ${schema.maximum}`);
    }

    return problems;
}

function isType(value, type) {
    switch (type) {
        case 'object': return value !== null && typeof value === 'object' && !Array.isArray(value);
        case 'array': return Array.isArray(value);
        case 'string': return typeof value === 'string';
        case 'integer': return Number.isInteger(value);
        case 'number': return typeof value === 'number' && Number.isFinite(value);
        case 'boolean': return typeof value === 'boolean';
        case 'null': return value === null;
        default: return false;
    }
}

function describe(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

module.exports = { validateSchema };
