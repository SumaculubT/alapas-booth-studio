// A simple in-memory cache to hold the template image URL
// This avoids sessionStorage quota limits for large images.

let templateImageCache: string | null = null;

export const setTemplateImage = (dataUrl: string) => {
  templateImageCache = dataUrl;
};

export const getTemplateImage = (): string | null => {
  return templateImageCache;
};

export const clearTemplateImage = () => {
    templateImageCache = null;
}