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

LP_TEMPLATES: dict[str, dict] = {
    "standard": {
        "label": "スタンダード",
        "description": "ヒーロー→ベネフィットカード→CTA。サービス紹介の定番構成",
    },
    "salesletter": {
        "label": "セールスレター",
        "description": "縦長で読ませる構成。セールス構造分析の本文をそのまま物語として流す",
    },
    "minimal": {
        "label": "ミニマル",
        "description": "キャッチコピー特化の1画面型。広告の着地点など短期決戦向け",
    },
}


def validate_accent(accent: str) -> str:
    if not HEX_COLOR_RE.match(accent):
        raise ValueError("accent は #RRGGBB 形式で指定してください")
    return accent


def validate_cta_url(url: str) -> str:
    url = url.strip() or "#"
    if url != "#" and not url.startswith(("http://", "https://", "/")):
        raise ValueError("cta_url は http(s):// か / で始まるURLを指定してください")
    return url


def validate_template(template: str) -> str:
    if template not in LP_TEMPLATES:
        raise ValueError(
            f"template は {', '.join(LP_TEMPLATES)} のいずれかを指定してください"
        )
    return template


def _base_css(accent: str) -> str:
    return f"""
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
    transition: transform .15s ease;
  }}
  a.button:hover {{ transform: translateY(-2px); }}
  header {{ padding: 20px 24px; }}
  header .brand {{ font-weight: 700; color: var(--accent); font-size: 1.05rem; }}
  footer {{ text-align: center; padding: 28px; color: #9aa1b5; font-size: .8rem; }}
"""


def _head(hero_title: str, hero_sub: str, product: str, css: str) -> str:
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
<style>{css}</style>
</head>
"""


def _parse_parts(lp_asset: dict) -> tuple[dict, list[dict], dict]:
    variants = [v for v in (lp_asset.get("variants") or []) if v.get("text") or v.get("title")]
    if not variants:
        raise ValueError("LPコピーに有効な案がありません。先にLPコピーを生成してください")
    hero = variants[0]
    cta = variants[-1] if len(variants) >= 2 else {"title": "詳しく見る", "text": ""}
    benefits = variants[1:-1] if len(variants) >= 3 else []
    return hero, benefits, cta


def _structure_sections(structure: dict | None) -> list[dict]:
    """セールスレター本文用に、構造のトップレベルノードをセクション化する。"""
    sections = []
    for node in (structure or {}).get("nodes") or []:
        paragraphs = [node.get("content") or ""]
        for child in node.get("children") or []:
            text = child.get("content") or child.get("title") or ""
            if text:
                paragraphs.append(text)
        sections.append({
            "label": node.get("type") or "",
            "title": node.get("title") or "",
            "paragraphs": [p for p in paragraphs if p],
        })
    return sections


def render_lp_html(
    lp_asset: dict,
    profile: dict | None = None,
    cta_url: str = "#",
    accent: str = "#6366f1",
    template: str = "standard",
    hero_override: str | None = None,
    structure: dict | None = None,
) -> str:
    """lp_copy素材からセルフコンテインドなHTML LPを組み立てる。

    hero_override: キャッチコピー等でヒーロー見出しを差し替える場合に指定。
    structure: salesletter テンプレートで本文セクションに使う logic_structure。
    """
    accent = validate_accent(accent)
    cta_url = validate_cta_url(cta_url)
    template = validate_template(template)

    e = html.escape
    profile = profile or {}
    product = e(profile.get("product_name") or "")

    hero, benefits, cta = _parse_parts(lp_asset)
    hero_title = e(hero_override or hero.get("title") or product or "タイトル未設定")
    hero_sub = e(hero.get("text") or "")
    cta_label = e(cta.get("title") or "詳しく見る")
    cta_push = e(cta.get("text") or "")
    cta_href = e(cta_url, quote=True)

    if template == "standard":
        body = _render_standard(
            e, product, hero_title, hero_sub, benefits, cta_label, cta_push, cta_href, accent
        )
    elif template == "salesletter":
        body = _render_salesletter(
            e, product, hero_title, hero_sub, benefits, cta_label, cta_push, cta_href,
            accent, _structure_sections(structure),
        )
    else:
        body = _render_minimal(
            e, product, hero_title, hero_sub, benefits, cta_label, cta_push, cta_href, accent
        )
    return body


def _render_standard(e, product, hero_title, hero_sub, benefits, cta_label, cta_push, cta_href, accent):
    css = _base_css(accent) + """
  .hero { max-width: 880px; margin: 0 auto; padding: 72px 24px 88px; text-align: center; }
  .hero h1 { font-size: clamp(1.8rem, 5vw, 3rem); line-height: 1.35; }
  .hero h1 .underline {
    background: linear-gradient(transparent 68%, color-mix(in srgb, var(--accent) 30%, transparent) 68%);
  }
  .hero p.sub { margin: 24px auto 40px; max-width: 640px; font-size: 1.1rem; color: #4a5165; }
  .benefits { background: #f7f8fb; padding: 72px 24px; }
  .benefits .inner { max-width: 980px; margin: 0 auto; display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
  .card { background: #fff; border-radius: 16px; padding: 32px 28px;
    box-shadow: 0 2px 12px rgba(20, 24, 40, .06); }
  .card h3 { font-size: 1.15rem; margin-bottom: 12px; color: var(--accent); }
  .card p { color: #4a5165; font-size: .95rem; }
  .cta { text-align: center; padding: 88px 24px; }
  .cta p.push { margin-bottom: 28px; font-size: 1.15rem; font-weight: 600; }
  @media (max-width: 640px) { .hero { padding: 48px 20px 64px; } .benefits, .cta { padding: 56px 20px; } }
"""
    cards = "\n".join(
        f"""      <div class="card">
        <h3>{e(b.get('title') or '')}</h3>
        <p>{e(b.get('text') or '')}</p>
      </div>"""
        for b in benefits
    )
    benefits_html = f"""  <section class="benefits">
    <div class="inner">
{cards}
    </div>
  </section>""" if cards else ""
    return f"""{_head(hero_title, hero_sub, product, css)}<body>
  <header><span class="brand">{product}</span></header>
  <section class="hero">
    <h1><span class="underline">{hero_title}</span></h1>
    <p class="sub">{hero_sub}</p>
    <a class="button" href="{cta_href}">{cta_label}</a>
  </section>
{benefits_html}
  <section class="cta">
    <p class="push">{cta_push}</p>
    <a class="button" href="{cta_href}">{cta_label}</a>
  </section>
  <footer>{product}</footer>
</body>
</html>
"""


def _render_salesletter(e, product, hero_title, hero_sub, benefits, cta_label, cta_push, cta_href, accent, sections):
    css = _base_css(accent) + """
  main { max-width: 680px; margin: 0 auto; padding: 48px 24px 80px; }
  .hero-sl { border-bottom: 3px solid var(--accent); padding-bottom: 40px; margin-bottom: 48px; }
  .hero-sl h1 { font-size: clamp(1.6rem, 4.5vw, 2.4rem); line-height: 1.45; margin-bottom: 16px; }
  .hero-sl p.sub { font-size: 1.05rem; color: #4a5165; }
  section.block { margin-bottom: 44px; }
  section.block .label { display: inline-block; font-size: .75rem; font-weight: 700; color: var(--accent);
    border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent); border-radius: 4px;
    padding: 2px 10px; margin-bottom: 10px; letter-spacing: .08em; }
  section.block h2 { font-size: 1.3rem; line-height: 1.5; margin-bottom: 12px; }
  section.block p { color: #333a4c; margin-bottom: 12px; }
  ul.checklist { list-style: none; margin: 20px 0; }
  ul.checklist li { padding-left: 32px; position: relative; margin-bottom: 14px; color: #333a4c; }
  ul.checklist li::before { content: "✓"; position: absolute; left: 0; top: 0;
    color: var(--accent); font-weight: 700; font-size: 1.1rem; }
  ul.checklist li strong { display: block; color: #1f2430; }
  .cta-box { border: 2px solid var(--accent); border-radius: 16px; text-align: center;
    padding: 40px 28px; margin-top: 56px;
    background: color-mix(in srgb, var(--accent) 5%, #fff); }
  .cta-box p.push { font-size: 1.1rem; font-weight: 700; margin-bottom: 24px; }
"""
    section_html = "\n".join(
        f"""    <section class="block">
      <span class="label">{e(s['label'])}</span>
      <h2>{e(s['title'])}</h2>
{chr(10).join(f"      <p>{e(p)}</p>" for p in s['paragraphs'])}
    </section>"""
        for s in sections
    )
    checklist = "\n".join(
        f"      <li><strong>{e(b.get('title') or '')}</strong>{e(b.get('text') or '')}</li>"
        for b in benefits
    )
    benefits_html = f"""    <section class="block">
      <h2>得られること</h2>
      <ul class="checklist">
{checklist}
      </ul>
    </section>""" if checklist else ""
    return f"""{_head(hero_title, hero_sub, product, css)}<body>
  <header><span class="brand">{product}</span></header>
  <main>
    <div class="hero-sl">
      <h1>{hero_title}</h1>
      <p class="sub">{hero_sub}</p>
    </div>
{section_html}
{benefits_html}
    <div class="cta-box">
      <p class="push">{cta_push}</p>
      <a class="button" href="{cta_href}">{cta_label}</a>
    </div>
  </main>
  <footer>{product}</footer>
</body>
</html>
"""


def _render_minimal(e, product, hero_title, hero_sub, benefits, cta_label, cta_push, cta_href, accent):
    css = _base_css(accent) + """
  .stage { min-height: 100vh; display: flex; flex-direction: column; }
  .hero-min { flex: 1; display: flex; flex-direction: column; justify-content: center;
    align-items: center; text-align: center; padding: 48px 24px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 8%, #fff), #fff 70%); }
  .hero-min h1 { font-size: clamp(2rem, 6vw, 3.6rem); line-height: 1.3; max-width: 820px; }
  .hero-min p.sub { margin: 24px auto 44px; max-width: 560px; font-size: 1.15rem; color: #4a5165; }
  .hero-min p.push { margin-top: 20px; font-size: .9rem; color: #6a7186; }
  .points { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px 28px;
    padding: 0 24px 48px; }
  .points span { font-size: .9rem; color: #4a5165; }
  .points span::before { content: "✓ "; color: var(--accent); font-weight: 700; }
"""
    points = "\n".join(
        f"    <span>{e(b.get('title') or '')}</span>" for b in benefits
    )
    points_html = f"""  <div class="points">
{points}
  </div>""" if points else ""
    return f"""{_head(hero_title, hero_sub, product, css)}<body>
  <div class="stage">
    <header><span class="brand">{product}</span></header>
    <section class="hero-min">
      <h1>{hero_title}</h1>
      <p class="sub">{hero_sub}</p>
      <a class="button" href="{cta_href}">{cta_label}</a>
      <p class="push">{cta_push}</p>
    </section>
{points_html}
    <footer>{product}</footer>
  </div>
</body>
</html>
"""
