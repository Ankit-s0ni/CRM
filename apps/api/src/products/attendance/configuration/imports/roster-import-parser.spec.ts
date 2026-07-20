import { normalizeRosterRow, parseRosterCsv } from './roster-import-parser';

describe('roster import parser', () => {
  it('parses and normalizes roster rows', () => {
    expect(
      parseRosterCsv(
        'employee_code,shift_name,roster_date\nEMP-1,Day,2026-07-20',
      ),
    ).toHaveLength(1);
    expect(
      normalizeRosterRow({
        employee_code: ' EMP-1 ',
        shift_name: ' Day ',
        roster_date: '2026-07-20',
      }),
    ).toEqual({
      employeeCode: 'EMP-1',
      shiftName: 'Day',
      rosterDate: '2026-07-20',
    });
  });

  it('rejects malformed dates', () => {
    expect(() =>
      normalizeRosterRow({
        employee_code: 'EMP-1',
        shift_name: 'Day',
        roster_date: '2026-02-31',
      }),
    ).toThrow('ROSTER_DATE_INVALID');
  });
});
