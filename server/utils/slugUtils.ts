export function slugify(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

export function shortRandomId(length = 5): string {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < length; i++) {
        out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
}

