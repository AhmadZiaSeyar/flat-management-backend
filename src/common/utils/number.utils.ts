export function toMoneyNumber(value: { toString(): string } | string | number) {
  return Number.parseFloat(value.toString());
}
