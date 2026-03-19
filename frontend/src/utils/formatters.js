export function formatNumber(value) {
  if (value === null || value === undefined) {
    return "--";
  }
  return value;
}

export function formatLapTime(value) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  const totalSeconds = Number(value);
  if (Number.isNaN(totalSeconds)) {
    return String(value);
  }

  const totalMilliseconds = Math.round(totalSeconds * 1000);
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMilliseconds % 60_000) / 1000);
  const milliseconds = totalMilliseconds % 1000;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}
