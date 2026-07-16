import { HttpException } from '@nestjs/common';
import {
  assertDepartmentPlacement,
  buildDepartmentTree,
  MAX_DEPARTMENT_DEPTH,
} from './department-tree';
import type { DepartmentRecord } from './department-tree';

describe('department tree rules', () => {
  it('builds and sorts a tree from a flat result without extra queries', () => {
    const departments = [
      department('support', 'Support', 'operations'),
      department('finance', 'Finance'),
      department('operations', 'Operations'),
    ];

    expect(buildDepartmentTree(departments)).toMatchObject([
      { id: 'finance', children: [] },
      {
        id: 'operations',
        children: [{ id: 'support', children: [] }],
      },
    ]);
  });

  it('rejects self-parenting and descendant cycles', () => {
    const departments = [
      department('root', 'Root'),
      department('child', 'Child', 'root'),
      department('leaf', 'Leaf', 'child'),
    ];

    expect(() =>
      assertDepartmentPlacement('root', 'root', departments),
    ).toThrow(HttpException);
    expect(() =>
      assertDepartmentPlacement('root', 'leaf', departments),
    ).toThrow(HttpException);
    expect(() =>
      assertDepartmentPlacement('leaf', 'root', departments),
    ).not.toThrow();
  });

  it(`rejects hierarchies deeper than ${MAX_DEPARTMENT_DEPTH} levels`, () => {
    const departments = Array.from(
      { length: MAX_DEPARTMENT_DEPTH },
      (_, index) =>
        department(
          `department-${index + 1}`,
          `Department ${index + 1}`,
          index === 0 ? null : `department-${index}`,
        ),
    );

    expect(() =>
      assertDepartmentPlacement(
        'new',
        `department-${MAX_DEPARTMENT_DEPTH}`,
        departments,
      ),
    ).toThrow(HttpException);
  });
});

function department(
  id: string,
  name: string,
  parentDeptId: string | null = null,
): DepartmentRecord {
  return {
    id,
    name,
    parentDeptId,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}
