/**
 * Scrapes metadata (title, description, image, sitename) from a URL.
 */
export async function scrapeLinkMetadata(url) {
  try {
    // Fetch page with a strict 4-second timeout to prevent server hanging
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) KikoLinkPreview/1.0' },
      signal: AbortSignal.timeout(4000)
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return null;
    }

    const html = await response.text();

    // Regex helpers to extract title, description, image, and site name
    const getMetaTag = (html, property) => {
      // Matches property="..." or name="..." style meta tags
      const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
      const match = html.match(regex);
      if (match) return match[1];

      // Reverse order: content="..." first
      const reverseRegex = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i');
      const reverseMatch = html.match(reverseRegex);
      if (reverseMatch) return reverseMatch[1];

      return null;
    };

    const getTitle = (html) => {
      const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return match ? match[1] : null;
    };

    // Extract fields
    const ogTitle = getMetaTag(html, 'og:title') || getTitle(html) || '';
    const ogDescription = getMetaTag(html, 'og:description') || getMetaTag(html, 'description') || '';
    const ogImage = getMetaTag(html, 'og:image') || '';
    const ogSiteName = getMetaTag(html, 'og:site_name') || new URL(url).hostname || '';
    
    // Choose branding color based on host
    let embedColor = '#2f3136'; // Default grey
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      embedColor = '#ff0000'; // Youtube Red
    } else if (url.includes('github.com')) {
      embedColor = '#24292e'; // Github black
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      embedColor = '#1da1f2'; // Twitter blue
    } else if (url.includes('spotify.com')) {
      embedColor = '#1db954'; // Spotify green
    }

    // Is there a video URL?
    const ogVideo = getMetaTag(html, 'og:video:url') || getMetaTag(html, 'og:video') || '';

    // If we have at least a title, return the metadata block
    if (ogTitle) {
      return {
        title: ogTitle.trim(),
        description: ogDescription.trim(),
        thumbnail: ogImage,
        siteName: ogSiteName,
        videoUrl: ogVideo,
        color: embedColor
      };
    }
  } catch (error) {
    console.error(`[Scraper] Failed to scrape metadata for ${url}:`, error.message);
  }
  return null;
}
