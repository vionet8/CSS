from app.services.marketing_service import structure_to_text


async def create_project(client, **kwargs):
    res = await client.post("/projects/", json={"title": "販促テスト", **kwargs})
    assert res.status_code == 200
    return res.json()


PROFILE = {
    "product_name": "Future Compass",
    "target_audience": "キャリアに悩む20-30代",
    "goal": "無料登録",
    "tone": "親しみやすく前向き",
}


async def test_marketing_options(client):
    res = await client.get("/marketing/options")
    assert res.status_code == 200
    data = res.json()
    ids = {f["id"] for f in data["frameworks"]}
    assert {"pasona", "aidma", "fab"} <= ids
    asset_ids = {a["id"] for a in data["asset_types"]}
    assert {"catchcopy", "x_post", "lp_copy", "sales_email", "press_release", "ad_copy"} <= asset_ids


def test_catchcopy_spec():
    """キャッチコピーは10案・全テーマが指示に含まれること。"""
    from app.services.marketing_service import ASSET_TYPES, CATCHCOPY_THEMES

    spec = ASSET_TYPES["catchcopy"]
    assert spec["count"] == 10
    assert len(CATCHCOPY_THEMES) == 10
    for theme in CATCHCOPY_THEMES:
        assert theme in spec["instruction"]


async def test_profile_save_and_persist(client):
    p = await create_project(client)
    res = await client.put(f"/projects/{p['id']}/marketing/profile", json=PROFILE)
    assert res.status_code == 200

    res = await client.get(f"/projects/{p['id']}")
    assert res.json()["assets"]["marketing_profile"] == PROFILE


async def test_analyze_rejects_unknown_framework(client):
    p = await create_project(client, raw_content="本文")
    res = await client.post(
        f"/projects/{p['id']}/marketing/analyze", json={"framework": "unknown"}
    )
    assert res.status_code == 400


async def test_analyze_requires_content(client):
    p = await create_project(client)
    res = await client.post(
        f"/projects/{p['id']}/marketing/analyze", json={"framework": "pasona"}
    )
    assert res.status_code == 400


async def test_analyze_sets_structure_with_framework(client, monkeypatch):
    structure = {"title": "T", "thesis": "買おう", "nodes": [], "framework": "pasona"}
    captured = {}

    async def fake_extract(content, framework, profile=None, fragments=None):
        captured["framework"] = framework
        captured["profile"] = profile
        return structure

    monkeypatch.setattr("app.api.marketing.extract_marketing_structure", fake_extract)
    p = await create_project(client, raw_content="本文")
    await client.put(f"/projects/{p['id']}/marketing/profile", json=PROFILE)

    res = await client.post(
        f"/projects/{p['id']}/marketing/analyze", json={"framework": "pasona"}
    )
    assert res.status_code == 200
    assert captured["framework"] == "pasona"
    assert captured["profile"] == PROFILE  # プロファイルが分析に渡される

    res = await client.get(f"/projects/{p['id']}")
    assert res.json()["logic_structure"]["framework"] == "pasona"


async def test_asset_generation_stores_and_persists(client, monkeypatch):
    async def fake_generate(source, asset_type, profile=None, fragments=None):
        return {
            "type": asset_type,
            "label": "テスト素材",
            "variants": [{"title": "", "text": f"{asset_type}のコピー"}],
            "generated_at": "2026-07-07T00:00:00+00:00",
        }

    monkeypatch.setattr("app.api.marketing.generate_marketing_asset", fake_generate)
    p = await create_project(client, raw_content="本文")
    pid = p["id"]

    res = await client.post(f"/projects/{pid}/marketing/assets", json={"asset_type": "x_post"})
    assert res.status_code == 200
    assert res.json()["asset"]["variants"][0]["text"] == "x_postのコピー"

    # 2つ目の素材が1つ目を壊さないこと（dict在り更新の回帰テスト）
    res = await client.post(f"/projects/{pid}/marketing/assets", json={"asset_type": "lp_copy"})
    assert res.status_code == 200

    res = await client.get(f"/projects/{pid}")
    stored = res.json()["assets"]["marketing_assets"]
    assert set(stored.keys()) == {"x_post", "lp_copy"}


async def test_asset_generation_requires_content_or_structure(client):
    p = await create_project(client)
    res = await client.post(
        f"/projects/{p['id']}/marketing/assets", json={"asset_type": "x_post"}
    )
    assert res.status_code == 400


async def test_asset_rejects_unknown_type(client):
    p = await create_project(client, raw_content="本文")
    res = await client.post(
        f"/projects/{p['id']}/marketing/assets", json={"asset_type": "tiktok"}
    )
    assert res.status_code == 400


async def test_asset_uses_structure_when_available(client, monkeypatch):
    captured = {}

    async def fake_generate(source, asset_type, profile=None, fragments=None):
        captured["source"] = source
        return {"type": asset_type, "label": "L", "variants": [{"title": "", "text": "x"}],
                "generated_at": "2026-07-07T00:00:00+00:00"}

    monkeypatch.setattr("app.api.marketing.generate_marketing_asset", fake_generate)
    p = await create_project(client, raw_content="生テキスト")
    structure = {"title": "構造T", "thesis": "主張", "nodes": [
        {"id": "n1", "type": "問題", "title": "課題", "content": "詳細", "children": []}
    ]}
    await client.patch(f"/projects/{p['id']}", json={"logic_structure": structure})

    await client.post(f"/projects/{p['id']}/marketing/assets", json={"asset_type": "ad_copy"})
    assert "構造T" in captured["source"]
    assert "[問題] 課題" in captured["source"]


async def test_delete_asset(client, monkeypatch):
    async def fake_generate(source, asset_type, profile=None, fragments=None):
        return {"type": asset_type, "label": "L", "variants": [{"title": "", "text": "x"}],
                "generated_at": "2026-07-07T00:00:00+00:00"}

    monkeypatch.setattr("app.api.marketing.generate_marketing_asset", fake_generate)
    p = await create_project(client, raw_content="本文")
    await client.post(f"/projects/{p['id']}/marketing/assets", json={"asset_type": "x_post"})

    res = await client.delete(f"/projects/{p['id']}/marketing/assets/x_post")
    assert res.status_code == 200
    res = await client.get(f"/projects/{p['id']}")
    assert res.json()["assets"]["marketing_assets"] == {}

    res = await client.delete(f"/projects/{p['id']}/marketing/assets/x_post")
    assert res.status_code == 404


def test_structure_to_text():
    structure = {
        "title": "T",
        "thesis": "主張",
        "nodes": [
            {"id": "n1", "type": "問題", "title": "課題", "content": "詳細",
             "children": [{"id": "n2", "type": "共感", "title": "子", "content": "c", "children": []}]},
        ],
    }
    text = structure_to_text(structure)
    assert "タイトル: T" in text
    assert "[問題] 課題: 詳細" in text
    assert "  - [共感] 子: c" in text


async def test_slides_receive_marketing_profile(client, monkeypatch):
    """スライド生成にマーケプロファイルが渡ること。"""
    captured = {}

    async def fake_generate(structure, marketing_profile=None):
        captured["profile"] = marketing_profile
        return [{"id": "s1", "order": 1, "title": "S"}]

    monkeypatch.setattr("app.api.projects.generate_slides_from_structure", fake_generate)
    p = await create_project(client, raw_content="本文")
    await client.put(f"/projects/{p['id']}/marketing/profile", json=PROFILE)
    await client.patch(f"/projects/{p['id']}", json={"logic_structure": {"nodes": []}})

    res = await client.post(f"/projects/{p['id']}/generate-slides")
    assert res.status_code == 200
    assert captured["profile"] == PROFILE
