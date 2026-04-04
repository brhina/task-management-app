const GA_MEASUREMENT_ID = 'G-YLV9KXZYJ0';

const canTrackAnalytics = () =>
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  typeof window.gtag === 'function';

export const trackPageView = (pagePath) => {
  if (!GA_MEASUREMENT_ID || !canTrackAnalytics()) {
    return;
  }

  window.gtag('event', 'page_view', {
    send_to: GA_MEASUREMENT_ID,
    page_path: pagePath,
    page_title: document.title,
    page_location: window.location.href,
  });
};
