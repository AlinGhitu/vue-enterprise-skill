// Stub monitoring adapter that references/errors.md reports to.
export const reported: Error[] = []

export function report(error: Error): void {
  reported.push(error)
}
