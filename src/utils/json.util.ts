export class JsonUtil {
  // Convert array to JSON string for database
  static arrayToJson(arr: string[] | null | undefined): string | null {
    if (!arr || arr.length === 0) {
      return null;
    }
    return JSON.stringify(arr);
  }

  // Convert JSON string from database to array
  static jsonToArray(json: string | null | undefined): string[] | null {
    if (!json) {
      return null;
    }

    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      console.error("Failed to parse JSON:", error);
      return null;
    }
  }

  // Safe JSON parse with fallback
  static safeParse<T>(json: string | null | undefined, fallback: T): T {
    if (!json) {
      return fallback;
    }

    try {
      return JSON.parse(json);
    } catch (error) {
      return fallback;
    }
  }
}
