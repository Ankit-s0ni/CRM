import { ConflictException } from '@nestjs/common';

export const MAX_DEPARTMENT_DEPTH = 20;

export type DepartmentRecord = {
  id: string;
  name: string;
  parentDeptId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DepartmentTreeNode = DepartmentRecord & {
  children: DepartmentTreeNode[];
};

export function assertDepartmentPlacement(
  departmentId: string,
  nextParentId: string,
  departments: Pick<DepartmentRecord, 'id' | 'parentDeptId'>[],
) {
  const parentById = new Map(
    departments.map((department) => [department.id, department.parentDeptId]),
  );
  const visited = new Set<string>();
  let depth = 1;
  let currentParentId: string | null | undefined = nextParentId;

  while (currentParentId) {
    if (currentParentId === departmentId || visited.has(currentParentId)) {
      throw new ConflictException({
        code: 'DEPARTMENT_CYCLE',
        message: 'Moving this department would create a hierarchy cycle',
      });
    }

    visited.add(currentParentId);
    depth += 1;
    if (depth > MAX_DEPARTMENT_DEPTH) {
      throw new ConflictException({
        code: 'DEPARTMENT_MAX_DEPTH',
        message: `Department hierarchy cannot exceed ${MAX_DEPARTMENT_DEPTH} levels`,
      });
    }
    currentParentId = parentById.get(currentParentId);
  }
}

export function buildDepartmentTree(
  departments: DepartmentRecord[],
): DepartmentTreeNode[] {
  const nodeById = new Map<string, DepartmentTreeNode>();
  const roots: DepartmentTreeNode[] = [];

  for (const department of departments) {
    nodeById.set(department.id, { ...department, children: [] });
  }

  for (const department of departments) {
    const node = nodeById.get(department.id)!;
    if (!department.parentDeptId) {
      roots.push(node);
      continue;
    }

    const parent = nodeById.get(department.parentDeptId);
    if (!parent) {
      roots.push(node);
      continue;
    }
    parent.children.push(node);
  }

  const sortNodes = (nodes: DepartmentTreeNode[]) => {
    nodes.sort((left, right) => left.name.localeCompare(right.name));
    for (const node of nodes) sortNodes(node.children);
  };

  sortNodes(roots);
  return roots;
}
