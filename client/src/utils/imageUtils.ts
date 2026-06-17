export const getAbsoluteImageUrl = (imageUrl: string | null | undefined): string => {
    if (!imageUrl) return '';

    if (imageUrl.startsWith('http') || imageUrl.startsWith('blob:')) {
        return imageUrl;
    }

    const baseUrl = import.meta.env.MODE === 'production'
        ? 'https://task-management-app-ma8h.onrender.com'
        : 'http://localhost:3001';

    return `${baseUrl}${imageUrl}`;
};

export const isValidImageUrl = (imageUrl: string | null | undefined): boolean => {
    if (!imageUrl) return false;

    if (imageUrl.startsWith('blob:')) return true;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return true;
    if (imageUrl.startsWith('/')) return true;

    return false;
};
