"""LPコピー素材から公開可能な一枚もののHTML LPを生成する。

AI生成ではなくテンプレートに流し込む方式:
- 出力が決定的でテスト可能
- 常に妥当なHTML（AIの構文崩れがない）
- 生成済みのLPコピー（lp_copy素材）をそのまま反映

lp_copy の variants 構造（marketing_service.ASSET_TYPES の指示に対応）:
- 先頭   = ヒーロー（title=見出し, text=サブコピー）
- 中間   = ベネフィット（title=見出し, text=説明）
- 最後   = CTA（title=ボタン文言, text=後押し文）
"""
import html
import re

HEX_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


def validate_accent(accent: str) -> str:
    if not HEX_COLOR_RE.match(accent):
        raise ValueError("accent は #RRGGBB 形式で指定してください")
    return accent


def validate_cta_url(url: str) -> str:
    url = url.strip() or "#"
    if url != "#" and not url.startswith(("http://", "https://", "/")):
        raise ValueError("cta_url は http(s):// か / で始まるURLを指定してください")
    return url


def render_lp_html(
    lp_asset: dict,
    profile: dict | None = None,
    cta_url: str = "#",
    accent: str = "#6366f1",
) -> str:
    """lp_copy素材からセルフコンテインドなHTML LPを組み立てる。"""
    accent = validate_accent(accent)
    cta_url = validate_cta_url(cta_url)

    variants = [v for v in (lp_asset.get("variants") or []) if v.get("text") or v.get("title")]
    if not variants:
        raise ValueError("LPコピーに有効な案がありません。先にLPコピーを生成してください")

    e = html.escape
    profile = profile or {}
    product = e(profile.get("product_name") or "")

    hero = variants[0]
    cta = variants[-1] if len(variants) >= 2 else {"title": "詳しく見る", "text": ""}
    benefits = variants[1:-1] if len(variants) >= 3 else []

    hero_title = e(hero.get("title") or product or "タイトル未設定")
    hero_sub = e(hero.get("text") or "")
    cta_label = e(cta.get("title") or "詳しく見る")
    cta_push = e(cta.get("text") or "")
    cta_href = e(cta_url, quote=True)

    benefit_cards = "\n".join(
        f"""      <div class="card">
        <h3>{e(b.get('title') or '')}</h3>
        <p>{e(b.get('text') or '')}</p>
      </div>"""
        for b in benefits
    )

    return f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{hero_title}{f" | {product}" if product else ""}</title>
<meta name="description" content="{hero_sub}">
<meta property="og:type" content="website">
<meta property="og:title" content="{hero_title}">
<meta property="og:description" content="{hero_sub}">
{f'<meta property="og:site_name" content="{product}">' if product else ''}
<style>
  :root {{ --accent: {accent}; }}
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    font-family: "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Noto Sans JP", Meiryo, sans-serif;
    color: #1f2430; line-height: 1.8; background: #ffffff;
  }}
  a.button {{
    display: inline-block; background: var(--accent); color: #fff;
    padding: 16px 44px; border-radius: 999px; text-decoration: none;
    font-weight: 700; font-size: 1.05rem;
    box-shadow: 0 8px 24px color-mix(in srgb, var(--accent) 40%, transparent);
    transition: transform .15s ease, box-shadow .15s ease;
  }}
  a.button:hover {{ transform: translateY(-2px); }}
  header {{ padding: 20px 24px; }}
  header .brand {{ font-weight: 700; color: var(--accent); font-size: 1.05rem; }}
  .hero {{
    max-width: 880px; margin: 0 auto; padding: 72px 24px 88px; text-align: center;
  }}
  .hero h1 {{ font-size: clamp(1.8rem, 5vw, 3rem); line-height: 1.35; letter-spacing: .01em; }}
  .hero h1 .underline {{
    background: linear-gradient(transparent 68%, color-mix(in srgb, var(--accent) 30%, transparent) 68%);
  }}
  .hero p.sub {{ margin: 24px auto 40px; max-width: 640px; font-size: 1.1rem; color: #4a5165; }}
  .benefits {{ background: #f7f8fb; padding: 72px 24px; }}
  .benefits .inner {{ max-width: 980px; margin: 0 auto; display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }}
  .card {{ background: #fff; border-radius: 16px; padding: 32px 28px;
    box-shadow: 0 2px 12px rgba(20, 24, 40, .06); }}
  .card h3 {{ font-size: 1.15rem; margin-bottom: 12px; color: var(--accent); }}
  .card p {{ color: #4a5165; font-size: .95rem; }}
  .cta {{ text-align: center; padding: 88px 24px; }}
  .cta p.push {{ margin-bottom: 28px; font-size: 1.15rem; font-weight: 600; }}
  footer {{ text-align: center; padding: 28px; color: #9aa1b5; font-size: .8rem; }}
  @media (max-width: 640px) {{
    .hero {{ padding: 48px 20px 64px; }}
    .benefits, .cta {{ padding: 56px 20px; }}
  }}
</style>
</head>
<body>
  <header><span class="brand">{product}</span></header>

  <section class="hero">
    <h1><span class="underline">{hero_title}</span></h1>
    <p class="sub">{hero_sub}</p>
    <a class="button" href="{cta_href}">{cta_label}</a>
  </section>

{f'''  <section class="benefits">
    <div class="inner">
{benefit_cards}
    </div>
  </section>''' if benefit_cards else ''}

  <section class="cta">
    <p class="push">{cta_push}</p>
    <a class="button" href="{cta_href}">{cta_label}</a>
  </section>

  <footer>{product}</footer>
</body>
</html>
"""
