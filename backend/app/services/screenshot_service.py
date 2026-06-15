import base64
from playwright.async_api import async_playwright
from app.services.ai_service import client


async def screenshot_url(url: str) -> tuple[bytes, str]:
    """Returns (png_bytes, markdown_analysis)"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])
        page = await browser.new_page(viewport={"width": 1280, "height": 900})
        await page.goto(url, wait_until="networkidle", timeout=30000)
        png = await page.screenshot(full_page=True)
        await browser.close()

    b64 = base64.standard_b64encode(png).decode()
    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": "image/png", "data": b64},
                },
                {
                    "type": "text",
                    "text": (
                        "このWebページのスクリーンショットを詳しく分析してください。\n\n"
                        "以下を抽出してMarkdownで回答:\n"
                        "1. ページ/サービス名\n"
                        "2. キャッチコピー・メインメッセージ\n"
                        "3. 主要コンテンツ（テキスト、見出し）\n"
                        "4. 機能・特徴のリスト\n"
                        "5. ビジュアル・デザインの特徴\n"
                        "6. CTA（行動喚起）\n"
                        "7. その他重要な情報"
                    ),
                },
            ],
        }],
    )
    analysis = message.content[0].text
    return png, analysis
