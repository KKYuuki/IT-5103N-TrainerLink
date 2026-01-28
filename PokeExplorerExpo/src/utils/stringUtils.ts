/**
 * Calculates the Levenshtein distance between two strings.
 * This effectively measures how "different" two words are.
 * Lower distance = closer match.
 */
export const levenshteinDistance = (a: string, b: string): number => {
    const matrix = [];

    // Increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

/**
 * Finds the closest matching string from a list.
 * @param input The search term (e.g. voice input)
 * @param candidates List of valid strings (e.g. pokemon names)
 * @param threshold Max distance to consider a match (default 5 or ~40% length)
 */
export const findClosestMatch = (input: string, candidates: string[], threshold: number = 3): string | null => {
    let closest = null;
    let minDistance = Infinity;
    const lowerInput = input.toLowerCase();

    for (const candidate of candidates) {
        const dist = levenshteinDistance(lowerInput, candidate.toLowerCase());

        if (dist < minDistance && dist <= threshold) {
            minDistance = dist;
            closest = candidate;
        }
    }

    return closest;
};
