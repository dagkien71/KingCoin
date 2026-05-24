export function convertDate(dateString: string) {
  return new Date(dateString).valueOf() / 1000;
}
