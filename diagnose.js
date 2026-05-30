const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";

fetch("https://www.facebook.com/profile.php?id=61572088497232&_rdr", {
  headers: {
    'User-Agent': USER_AGENT,
    'Accept-Language': 'en-US,en;q=0.9',
  },
  redirect: 'follow'
})
  .then(async (fbRes) => {
    console.log("STATUS:", fbRes.status);
    console.log("OK:", fbRes.ok);
    const html = await fbRes.text();
    
    let title = null;
    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    if (ogTitleMatch && ogTitleMatch[1]) {
      title = ogTitleMatch[1].split('|')[0].trim();
    }
    if (!title) {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      title = titleMatch ? titleMatch[1].split('|')[0].trim() : '';
    }
    
    console.log("RESOLVED TITLE:", title);
    
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    console.log("OG IMAGE MATCH:", ogImageMatch ? ogImageMatch[1].slice(0, 100) : "not found");
  })
  .catch(err => console.error("FETCH ERROR:", err));
