export function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return month;
  }

  const [year, monthNumber] = month.split("-");
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric"
  }).format(new Date(Number(year), Number(monthNumber) - 1, 1));
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium"
  }).format(new Date(`${date}T00:00:00`));
}
