export type ArchiveMonth = {
  year: number;
  month: number;
  label: string;
  href: string;
};

const ARCHIVE_START_YEAR = 2026;
const ARCHIVE_START_MONTH = 6;
const RELEASE_HOUR = 12;
const MONTH_LABELS = [
  "一月",
  "二月",
  "三月",
  "四月",
  "五月",
  "六月",
  "七月",
  "八月",
  "九月",
  "十月",
  "十一月",
  "十二月",
];

function getShanghaiDateParts(now: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
  };
}

export function getAvailableArchiveMonths(now = new Date()): ArchiveMonth[] {
  const current = getShanghaiDateParts(now);
  let endYear = current.year;
  let endMonth = current.month;

  if (current.day === 1 && current.hour < RELEASE_HOUR) {
    endMonth -= 1;
    if (endMonth === 0) {
      endMonth = 12;
      endYear -= 1;
    }
  }

  const months: ArchiveMonth[] = [];
  let year = ARCHIVE_START_YEAR;
  let month = ARCHIVE_START_MONTH;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.unshift({
      year,
      month,
      label: `${MONTH_LABELS[month - 1]} ${year}`,
      href: `/archive/${year}/${String(month).padStart(2, "0")}`,
    });

    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }

  return months;
}

export function isPostInArchiveMonth(
  post: { archiveDate?: string; date: string },
  year: number,
  month: number,
) {
  const archiveMatch = post.archiveDate?.match(/^(\d{4})年(\d{1,2})月/);

  if (archiveMatch) {
    return Number(archiveMatch[1]) === year && Number(archiveMatch[2]) === month;
  }

  const parsedDate = new Date(post.date);
  return (
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.getFullYear() === year &&
    parsedDate.getMonth() + 1 === month
  );
}

export function getArchiveMonthLabel(year: number, month: number) {
  return `${MONTH_LABELS[month - 1]} ${year}`;
}
