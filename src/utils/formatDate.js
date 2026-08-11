/**
 * Formats an ISO date string or Date object into date and time components.
 * Example input: "2026-08-02T13:31:55.493Z"
 * Returns: { dateStr: "02-Aug", yearStr: "2026", timeStr: "01:31 PM", fullDate: "02 Aug 2026, 01:31 PM" }
 */
export const formatDateTime = (isoString) => {
  if (!isoString) {
    return {
      dateStr: '-',
      yearStr: '-',
      timeStr: '-',
      fullDate: 'N/A',
    };
  }

  const d = new Date(isoString);

  if (isNaN(d.getTime())) {
    return {
      dateStr: String(isoString),
      yearStr: '',
      timeStr: '',
      fullDate: String(isoString),
    };
  }

  // Format using UTC methods to preserve the exact stored time
  const day = String(d.getUTCDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getUTCMonth()];
  const dateStr = `${day}-${month}`;
  const yearStr = d.getUTCFullYear().toString();

  let hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 hour should be 12
  const formattedHours = String(hours).padStart(2, '0');

  const timeStr = `${formattedHours}:${minutes}:${seconds} ${ampm}`;
  const fullDate = `${day} ${month} ${yearStr}, ${timeStr}`;

  return {
    dateStr,
    yearStr,
    timeStr,
    fullDate,
  };
};

export default formatDateTime;
