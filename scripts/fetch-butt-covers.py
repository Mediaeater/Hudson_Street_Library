#!/usr/bin/env python3
import json
import asyncio
from playwright.async_api import async_playwright

async def fetch_butt_covers():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("Fetching Butt Magazine library page...")
        await page.goto('https://buttmagazine.com/library/', wait_until='networkidle')

        # Wait for images to load
        await page.wait_for_timeout(3000)

        # Extract issue data
        issues = await page.evaluate('''() => {
            const issueData = [];
            const links = Array.from(document.querySelectorAll('a[href*="/library/butt-"]'));

            links.forEach(link => {
                const href = link.getAttribute('href');
                const match = href.match(/butt-(\\d+)/);

                if (match) {
                    const issueNum = parseInt(match[1]);
                    if (issueNum >= 3 && issueNum <= 37) {
                        const img = link.querySelector('img');
                        const imgSrc = img ? (img.src || img.getAttribute('data-src') || img.getAttribute('srcset')) : null;

                        issueData.push({
                            issue: issueNum,
                            url: href,
                            imageSrc: imgSrc
                        });
                    }
                }
            });

            // Remove duplicates and sort
            const unique = Array.from(new Map(issueData.map(item => [item.issue, item])).values());
            return unique.sort((a, b) => a.issue - b.issue);
        }''')

        print(f"\nFound {len(issues)} issues:")
        for item in issues:
            print(f"Issue #{item['issue']}: {item['imageSrc'][:100] if item['imageSrc'] else 'No image found'}...")

        # Save to JSON
        with open('scripts/butt-covers.json', 'w') as f:
            json.dump(issues, f, indent=2)

        print("\nSaved to scripts/butt-covers.json")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(fetch_butt_covers())
