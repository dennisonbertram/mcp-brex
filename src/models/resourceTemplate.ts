/**
 * @file ResourceTemplate Class
 * @version 1.0.0
 * @description A utility class for handling URI templates in the MCP server
 */

/**
 * ResourceTemplate - Processes URI templates of the form "prefix{/param}" and
 * matches URIs against them, extracting parameters.
 */
export class ResourceTemplate {
  private template: string;
  private regex: RegExp;

  /**
   * Creates a new ResourceTemplate for a given URI template pattern
   * @param template The URI template string (e.g., "brex://accounts{/id}")
   */
  constructor(template: string) {
    this.template = template;
    // Convert {/param} syntax to regex capture groups
    const regexStr = template
      .replace(/\{\/([^}]+)\}/g, '(?:/([^/]+))?')
      .replace(/\//g, '\\/');
    this.regex = new RegExp(`^${regexStr}$`);
  }

  /**
   * Checks if a URI matches this template
   * @param uri The URI to check
   * @returns true if the URI matches the template, false otherwise
   */
  match(uri: string): boolean {
    return this.regex.test(uri);
  }

  /**
   * Extracts parameters from a URI that matches this template
   * @param uri The URI to parse
   * @returns An object containing the extracted parameters
   */
  parse(uri: string): { [key: string]: string } {
    const match = uri.match(this.regex);
    if (!match) {
      return {};
    }

    // Extract param names from the template
    const paramNames: string[] = [];
    const paramRegex = /\{\/([^}]+)\}/g;
    let paramMatch;
    while ((paramMatch = paramRegex.exec(this.template)) !== null) {
      paramNames.push(paramMatch[1]);
    }

    // Create result object with param names mapped to captured values
    const result: { [key: string]: string } = {};
    for (let i = 0; i < paramNames.length; i++) {
      if (match[i + 1] !== undefined) {
        result[paramNames[i]] = match[i + 1];
      }
    }
    return result;
  }
} 