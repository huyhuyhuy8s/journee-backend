export class DateHelper {
  static getDateKey(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  static isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  /**
   * Get start of day (00:00:00) in specified timezone, returned as UTC timestamp
   * For UTC+7: Dec 28 00:00 local = Dec 27 17:00 UTC
   */
  static getStartOfDay(timezoneOffset = 7): Date {
    const now = new Date();

    // Get current time in target timezone
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const localTime = new Date(utcTime + timezoneOffset * 3600000);

    // Set to start of day in that timezone
    localTime.setHours(0, 0, 0, 0);

    // Convert back to UTC by subtracting the offset
    return new Date(localTime.getTime() - timezoneOffset * 3600000);
  }

  /**
   * Get end of day (23:59:59.999) in specified timezone, returned as UTC timestamp
   * For UTC+7: Dec 28 23:59 local = Dec 28 16:59 UTC
   */
  static getEndOfDay(timezoneOffset = 7): Date {
    const now = new Date();

    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const localTime = new Date(utcTime + timezoneOffset * 3600000);

    localTime.setHours(23, 59, 59, 999);

    return new Date(localTime.getTime() - timezoneOffset * 3600000);
  }
}