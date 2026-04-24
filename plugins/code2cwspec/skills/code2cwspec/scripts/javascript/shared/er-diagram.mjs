import path from 'path';

import { findUnderSpecs, readFileSync } from './tools.mjs';
import { parseToTable } from './parse.mjs';

export const normalizeEntityKeyword = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '');

export const extractForeignEntity = (source = '') => {
  const matched = String(source).match(/外键(?:关联实体)?\s*([A-Za-z][A-Za-z0-9_]*)/);

  return matched?.[1] || '';
};

export const getErDiagramBundle = (rootDir = '') =>
  findUnderSpecs(rootDir)((item = '') => item.includes('/data-model/er-diagram.md'));

export const extractMermaidBody = (source = '') => source.match(/```mermaid\s*\n([\s\S]*?)\n```/)?.[1] || '';

export const parseErEntities = (body = '') => {
  const store = new Map();
  const entityReg = /^  (\w+)\s*\{([\s\S]*?)\n  \}/gm;
  let matched;

  while ((matched = entityReg.exec(body)) !== null) {
    const [, entityName = '', entityBody = ''] = matched;
    const lines = entityBody.split('\n');
    const fields = lines
      .map((line = '') => {
        const rawLine = line.trim();
        const fieldMatched = rawLine.match(/^(\S+)\s+(\w+)(?:\s+(PK|FK))?\s+"([^"]*)"/);

        if (!fieldMatched) {
          return;
        }

        const [, type = '', fieldName = '', marker = '', title = ''] = fieldMatched;

        return { type, fieldName, marker, title, rawLine };
      })
      .filter(Boolean);

    store.set(entityName, { entityName, fields, rawBlock: matched[0] });
  }

  return store;
};

export const parseErRelations = (body = '') =>
  body
    .split('\n')
    .map((line = '') => line.trim())
    .map((line = '') => {
      const matched = line.match(
        /^([A-Za-z][A-Za-z0-9_]*)\s+([|}{o]+(?:--|\.\.)[|}{o]+)\s+([A-Za-z][A-Za-z0-9_]*)\s*(?::\s*(?:"([^"]*)"|(.+)))?$/
      );

      if (!matched) {
        return;
      }

      const [, leftEntity = '', operator = '', rightEntity = '', quotedLabel = '', plainLabel = ''] = matched;
      const operatorMatched = operator.match(/^([|}{o]+)(--|\.\.)([|}{o]+)$/);

      if (!operatorMatched) {
        return;
      }

      const [, leftMarker = '', connector = '', rightMarker = ''] = operatorMatched;

      return {
        leftEntity,
        rightEntity,
        operator,
        leftMarker,
        rightMarker,
        connector,
        label: quotedLabel || plainLabel || '',
        rawLine: line,
      };
    })
    .filter(Boolean);

export const toErRelationExpectations = (relations = []) => {
  const store = new Map();

  relations.forEach((relation = {}) => {
    const { leftEntity = '', rightEntity = '', leftMarker = '', rightMarker = '' } = relation;
    const leftMany = /[{}]/.test(leftMarker);
    const rightMany = /[{}]/.test(rightMarker);

    if (leftMany === rightMany) {
      return;
    }

    const parentEntity = leftMany ? rightEntity : leftEntity;
    const childEntity = leftMany ? leftEntity : rightEntity;
    const key = `${parentEntity}=>${childEntity}`;

    if (!store.has(key)) {
      store.set(key, { ...relation, parentEntity, childEntity });
    }
  });

  return Array.from(store.values());
};

export const readErDiagramSnapshot = (rootDir = '') => {
  const bundle = getErDiagramBundle(rootDir);
  const absoluteFilePath = bundle?.absoluteFilePath;
  const source = readFileSync(absoluteFilePath) || '';
  const mermaidBody = extractMermaidBody(source);
  const entities = parseErEntities(mermaidBody);
  const relations = parseErRelations(mermaidBody);
  const expectations = toErRelationExpectations(relations);
  const expectationsByChild = new Map();

  expectations.forEach((item = {}) => {
    const { childEntity = '' } = item;
    const current = expectationsByChild.get(childEntity) || [];

    current.push(item);
    expectationsByChild.set(childEntity, current);
  });

  return {
    bundle,
    absoluteFilePath,
    source,
    mermaidBody,
    entities,
    relations,
    expectations,
    expectationsByChild,
  };
};

export const parseEntityForeignKeysFromTable =
  (options = {}) =>
  (source = '') => {
    const table = parseToTable(options)(source) || [];

    return table
      .map((item = []) => {
        const [fieldName = '', title = '', dataType = '', features = ''] = item;
        const targetEntity = extractForeignEntity(features);

        if (!targetEntity) {
          return;
        }

        return {
          fieldName,
          title,
          dataType,
          targetEntity,
          features,
          rawLine: `| ${item.join(' | ')} |`,
        };
      })
      .filter(Boolean);
  };

export const parseEntityRelationAnnotations = (source = '') => {
  const reg =
    /@EntityRelation<app\.dataSources\.defaultDS\.entities\.([A-Za-z][A-Za-z0-9_]*)\['([^']+)'\]>\([^)]*\)\s*(?:\/\*[\s\S]*?\*\/\s*)?(?:\/\/.*?\n\s*)?(\w+)\s*:\s*([A-Za-z][A-Za-z0-9_]*)/g;
  const result = [];
  let matched;

  while ((matched = reg.exec(source)) !== null) {
    const [, targetEntity = '', targetField = '', fieldName = '', dataType = ''] = matched;

    result.push({
      fieldName,
      dataType,
      targetEntity,
      targetField,
      rawLine: matched[0].replace(/\s+/g, ' ').trim(),
    });
  }

  return result;
};

export const pickRelevantRelationItems = (items = [], expectedEntity = '') => {
  const expected = normalizeEntityKeyword(expectedEntity);

  if (!expected) {
    return items;
  }

  const filtered = items.filter((item = {}) =>
    [item.fieldName, item.title, item.targetEntity, item.type, item.rawLine].some((value = '') =>
      normalizeEntityKeyword(value).includes(expected)
    )
  );

  return filtered.length ? filtered : items;
};

export const getEntityNameFromBundle = (bundle = {}) => {
  const fileName = bundle.fileName || path.basename(bundle.absoluteFilePath || '');
  const matched = fileName.match(/^entity-(.+)\.md$/);

  return matched?.[1] || '';
};
