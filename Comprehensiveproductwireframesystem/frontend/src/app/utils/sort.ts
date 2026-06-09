export function sortByRecent<T extends { createdAt?: Date | string; updatedAt?: Date | string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bDate - aDate;
  });
}
