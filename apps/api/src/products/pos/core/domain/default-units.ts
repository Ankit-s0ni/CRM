/**
 * Units every POS tenant starts with. Framework-free: no NestJS, no Prisma.
 *
 * `baseCode` + `factor` are modelled from day one so products never have to migrate off a
 * free-text unit column. Nothing reads them until MVP-02 introduces weight/pack handling.
 */
export interface DefaultUnitDefinition {
  readonly code: string;
  readonly name: string;
  /** Code of the unit this one converts into, if any. */
  readonly baseCode?: string;
  /** How many base units one of these equals, as a string to stay off floats. */
  readonly factor?: string;
}

export const DEFAULT_UNITS: readonly DefaultUnitDefinition[] = [
  { code: 'PCS', name: 'Piece' },
  { code: 'KG', name: 'Kilogram' },
  { code: 'GRAM', name: 'Gram', baseCode: 'KG', factor: '0.0010' },
  { code: 'LTR', name: 'Litre' },
  { code: 'MTR', name: 'Metre' },
  { code: 'BOX', name: 'Box' },
  { code: 'PACK', name: 'Pack' },
  { code: 'DOZEN', name: 'Dozen', baseCode: 'PCS', factor: '12.0000' },
];
