export class WorkMinutes {
  private constructor(readonly value: number) {}

  static of(value: number) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('WORK_MINUTES_INVALID');
    }
    return new WorkMinutes(value);
  }

  plus(other: WorkMinutes) {
    return WorkMinutes.of(this.value + other.value);
  }

  minusFloor(other: WorkMinutes) {
    return WorkMinutes.of(Math.max(0, this.value - other.value));
  }
}
