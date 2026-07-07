import pytest
from app.services.lp_service import (
    LP_TEMPLATES,
    render_lp_html,
    validate_accent,
    validate_cta_url,
    validate_template,
)

LP_ASSET = {
    "type": "lp_copy",
    "label": "LPコピー",
    "variants": [
        {"title": "迷わないキャリアを、今日から", "text": "AIがあなたの5年後を一緒に描く"},
        {"title": "3分で現在地がわかる", "text": "診断でキャリアの現在地を可視化"},
        {"title": "選択肢が広がる", "text": "気づかなかった道をAIが提案"},
        {"title": "無料で始める", "text": "登録は30秒。今すぐ未来の地図を手に入れよう"},
    ],
    "generated_at": "2026-07-07T00:00:00+00:00",
}

PROFILE = {"product_name": "Future Compass", "target_audience": "", "goal": "", "tone": ""}


def test_render_contains_copy_and_ogp():
    html_text = render_lp_html(LP_ASSET, PROFILE, cta_url="https://example.com/signup", accent="#ff6600")
    assert "<!doctype html>" in html_text
    assert "迷わないキャリアを、今日から" in html_text          # ヒーロー見出し
    assert "AIがあなたの5年後を一緒に描く" in html_text          # サブコピー
    assert "3分で現在地がわかる" in html_text                    # ベネフィット
    assert "無料で始める" in html_text                           # CTAボタン
    assert 'href="https://example.com/signup"' in html_text
    assert "--accent: #ff6600" in html_text
    assert 'property="og:title"' in html_text
    assert "Future Compass" in html_text


def test_render_escapes_html_in_copy():
    asset = {"variants": [
        {"title": "<script>alert(1)</script>", "text": "安全<b>第一</b>"},
        {"title": "登録", "text": "今すぐ"},
    ]}
    html_text = render_lp_html(asset)
    assert "<script>alert(1)</script>" not in html_text
    assert "&lt;script&gt;" in html_text
    assert "<b>" not in html_text.replace("<body>", "")


def test_render_requires_variants():
    with pytest.raises(ValueError):
        render_lp_html({"variants": []})


def test_validate_accent():
    assert validate_accent("#AABB00") == "#AABB00"
    for bad in ["red", "#fff", "#gggggg", "#112233; }body{", ""]:
        with pytest.raises(ValueError):
            validate_accent(bad)


STRUCTURE = {
    "title": "T",
    "thesis": "主張",
    "framework": "pasona",
    "nodes": [
        {"id": "n1", "type": "問題", "title": "キャリアの迷子が増えている",
         "content": "選択肢が多すぎて決められない時代です。",
         "children": [{"id": "n2", "type": "共感", "title": "", "content": "私たちも同じ悩みを抱えていました。", "children": []}]},
        {"id": "n3", "type": "解決策", "title": "AIで現在地を可視化する",
         "content": "診断とマップで迷いを構造化します。", "children": []},
    ],
}


def test_validate_template():
    for t in LP_TEMPLATES:
        assert validate_template(t) == t
    with pytest.raises(ValueError):
        validate_template("fancy")


def test_render_salesletter_includes_structure_sections():
    html_text = render_lp_html(LP_ASSET, PROFILE, template="salesletter", structure=STRUCTURE)
    assert "キャリアの迷子が増えている" in html_text          # 構造ノード見出し
    assert "選択肢が多すぎて決められない時代です。" in html_text  # 本文
    assert "私たちも同じ悩みを抱えていました。" in html_text      # 子ノード
    assert "checklist" in html_text                              # ベネフィットはチェックリスト
    assert "迷わないキャリアを、今日から" in html_text


def test_render_salesletter_without_structure():
    html_text = render_lp_html(LP_ASSET, PROFILE, template="salesletter")
    assert "迷わないキャリアを、今日から" in html_text
    assert "無料で始める" in html_text


def test_render_minimal():
    html_text = render_lp_html(LP_ASSET, PROFILE, template="minimal")
    assert "hero-min" in html_text
    assert "迷わないキャリアを、今日から" in html_text
    assert "3分で現在地がわかる" in html_text  # ポイント行


def test_hero_override_replaces_headline():
    html_text = render_lp_html(LP_ASSET, PROFILE, hero_override="あなたの5年後、見えていますか？")
    assert "あなたの5年後、見えていますか？" in html_text
    assert "<h1><span class=\"underline\">迷わないキャリアを、今日から" not in html_text
    # サブコピーは元のまま
    assert "AIがあなたの5年後を一緒に描く" in html_text


def test_validate_cta_url_blocks_javascript():
    assert validate_cta_url("") == "#"
    assert validate_cta_url("https://a.example") == "https://a.example"
    assert validate_cta_url("/signup") == "/signup"
    with pytest.raises(ValueError):
        validate_cta_url("javascript:alert(1)")


# ---- APIエンドポイント ----


async def create_project(client, **kwargs):
    res = await client.post("/projects/", json={"title": "LP", **kwargs})
    return res.json()


async def test_lp_export_requires_lp_copy(client):
    p = await create_project(client)
    res = await client.get(f"/projects/{p['id']}/marketing/lp.html")
    assert res.status_code == 400


async def test_lp_export_endpoint(client, monkeypatch):
    async def fake_generate(source, asset_type, profile=None, fragments=None):
        return LP_ASSET

    monkeypatch.setattr("app.api.marketing.generate_marketing_asset", fake_generate)
    p = await create_project(client, raw_content="本文")
    await client.put(f"/projects/{p['id']}/marketing/profile", json=PROFILE)
    await client.post(f"/projects/{p['id']}/marketing/assets", json={"asset_type": "lp_copy"})

    res = await client.get(
        f"/projects/{p['id']}/marketing/lp.html",
        params={"cta_url": "https://example.com", "accent": "#22aa66"},
    )
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/html")
    assert "迷わないキャリアを、今日から" in res.text
    assert "--accent: #22aa66" in res.text

    # 不正なパラメータは400
    res = await client.get(
        f"/projects/{p['id']}/marketing/lp.html", params={"cta_url": "javascript:alert(1)"}
    )
    assert res.status_code == 400
    res = await client.get(
        f"/projects/{p['id']}/marketing/lp.html", params={"accent": "red"}
    )
    assert res.status_code == 400

    res = await client.get(
        f"/projects/{p['id']}/marketing/lp.html", params={"template": "fancy"}
    )
    assert res.status_code == 400


async def test_lp_export_with_catchcopy_hero(client, monkeypatch):
    assets = {
        "lp_copy": LP_ASSET,
        "catchcopy": {"type": "catchcopy", "label": "キャッチコピー", "variants": [
            {"title": "問いかけ", "text": "あなたの5年後、見えていますか？"},
        ], "generated_at": "2026-07-07T00:00:00+00:00"},
    }

    async def fake_generate(source, asset_type, profile=None, fragments=None):
        return assets[asset_type]

    monkeypatch.setattr("app.api.marketing.generate_marketing_asset", fake_generate)
    p = await create_project(client, raw_content="本文")
    for t in ["lp_copy", "catchcopy"]:
        await client.post(f"/projects/{p['id']}/marketing/assets", json={"asset_type": t})

    res = await client.get(
        f"/projects/{p['id']}/marketing/lp.html",
        params={"catchcopy_index": 0, "template": "minimal"},
    )
    assert res.status_code == 200
    assert "あなたの5年後、見えていますか？" in res.text

    res = await client.get(
        f"/projects/{p['id']}/marketing/lp.html", params={"catchcopy_index": 9}
    )
    assert res.status_code == 400  # 範囲外


async def test_options_include_lp_templates(client):
    res = await client.get("/marketing/options")
    ids = {t["id"] for t in res.json()["lp_templates"]}
    assert ids == {"standard", "salesletter", "minimal"}
