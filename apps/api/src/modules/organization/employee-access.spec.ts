import { collectReportingEmployeeIds } from './employee-access';

describe('employee access scope', () => {
  it('includes the manager and all direct and indirect reports', () => {
    const ids = collectReportingEmployeeIds('manager', [
      { id: 'manager', managerId: null },
      { id: 'direct', managerId: 'manager' },
      { id: 'indirect', managerId: 'direct' },
      { id: 'unrelated', managerId: null },
    ]);

    expect(ids.sort()).toEqual(['direct', 'indirect', 'manager']);
  });
});
