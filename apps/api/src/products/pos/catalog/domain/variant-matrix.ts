/**
 * Variant matrix generation. Framework-free: no NestJS, no Prisma.
 */
export interface VariantAttribute {
  readonly name: string;
  readonly values: readonly string[];
}

export interface GeneratedVariant {
  /** e.g. "Red / Large" */
  readonly name: string;
  readonly sku: string;
  readonly attributes: Record<string, string>;
}

export class VariantMatrixError extends Error {}

const MAX_COMBINATIONS = 200;

function slug(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Cartesian product of the attribute values, in declaration order.
 *
 * Generated SKUs are `<baseSku>-<VALUE>-<VALUE>`. They are deterministic, so regenerating
 * a matrix produces the same SKUs and the caller can diff against what already exists
 * instead of creating duplicates.
 */
export function generateVariantMatrix(
  baseSku: string,
  attributes: readonly VariantAttribute[],
): GeneratedVariant[] {
  if (attributes.length === 0) {
    throw new VariantMatrixError('At least one attribute is required');
  }
  for (const attribute of attributes) {
    if (!attribute.name.trim()) {
      throw new VariantMatrixError('Attribute name cannot be empty');
    }
    if (attribute.values.length === 0) {
      throw new VariantMatrixError(
        `Attribute "${attribute.name}" needs at least one value`,
      );
    }
    const unique = new Set(attribute.values.map((value) => value.trim()));
    if (unique.size !== attribute.values.length) {
      throw new VariantMatrixError(
        `Attribute "${attribute.name}" has duplicate values`,
      );
    }
  }

  const total = attributes.reduce(
    (count, attribute) => count * attribute.values.length,
    1,
  );
  if (total > MAX_COMBINATIONS) {
    throw new VariantMatrixError(
      `Matrix would produce ${total} variants; the limit is ${MAX_COMBINATIONS}`,
    );
  }

  let rows: GeneratedVariant[] = [{ name: '', sku: baseSku, attributes: {} }];
  for (const attribute of attributes) {
    const next: GeneratedVariant[] = [];
    for (const row of rows) {
      for (const rawValue of attribute.values) {
        const value = rawValue.trim();
        next.push({
          name: row.name ? `${row.name} / ${value}` : value,
          sku: `${row.sku}-${slug(value)}`,
          attributes: { ...row.attributes, [attribute.name]: value },
        });
      }
    }
    rows = next;
  }

  // Two different values can slug to the same token (e.g. "X L" and "X-L"). Surface that
  // rather than silently emitting colliding SKUs the database would then reject.
  const seen = new Map<string, string>();
  for (const row of rows) {
    const clash = seen.get(row.sku);
    if (clash) {
      throw new VariantMatrixError(
        `"${row.name}" and "${clash}" both generate SKU ${row.sku}`,
      );
    }
    seen.set(row.sku, row.name);
  }

  return rows;
}
