export const getAbsoluteImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) return '';

  if (imageUrl.startsWith('blob:')) {
    return imageUrl;
  }

  const baseUrl =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    (import.meta.env.MODE === 'production' ? '' : 'http://localhost:3001');

  const uploadsMatch = imageUrl.match(/\/uploads\/[^/?#]+/);
  if (uploadsMatch) {
    return `${baseUrl}${uploadsMatch[0]}`;
  }

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  return `${baseUrl}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
};

export const isValidImageUrl = (imageUrl: string | null | undefined): boolean => {
  if (!imageUrl) return false;

  if (imageUrl.startsWith('blob:')) return true;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return true;
  if (imageUrl.startsWith('/')) return true;

  return false;
};
