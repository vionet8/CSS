import pytest


async def create_project(client, **kwargs):
    payload = {"title": "テスト", **kwargs}
    res = await client.post("/projects/", json=payload)
    assert res.status_code == 200
    return res.json()


async def test_project_crud(client):
    p = await create_project(client, description="説明", raw_content="本文")
    pid = p["id"]

    res = await client.get("/projects/")
    assert res.status_code == 200
    assert len(res.json()) == 1

    res = await client.get(f"/projects/{pid}")
    assert res.json()["raw_content"] == "本文"

    res = await client.patch(f"/projects/{pid}", json={"title": "更新後"})
    assert res.json()["title"] == "更新後"

    res = await client.delete(f"/projects/{pid}")
    assert res.json() == {"ok": True}

    res = await client.get(f"/projects/{pid}")
    assert res.status_code == 404


async def test_get_missing_project_returns_404(client):
    res = await client.get("/projects/nonexistent")
    assert res.status_code == 404


async def test_update_slide_persists(client):
    """スライド部分更新がDBに永続化されること（in-place更新バグの回帰テスト）。"""
    p = await create_project(client)
    pid = p["id"]
    slides = [
        {"id": "slide_1", "order": 1, "title": "A", "body": "a", "template": "hero-headline"},
        {"id": "slide_2", "order": 2, "title": "B", "body": "b", "template": "numbered-list"},
    ]
    await client.patch(f"/projects/{pid}", json={"slides": slides})

    res = await client.patch(f"/projects/{pid}/slides/slide_2", json={"title": "B改"})
    assert res.status_code == 200
    assert res.json()["slide"]["title"] == "B改"

    # 別リクエストで読み直して永続化を確認
    res = await client.get(f"/projects/{pid}")
    saved = {s["id"]: s for s in res.json()["slides"]}
    assert saved["slide_2"]["title"] == "B改"
    assert saved["slide_2"]["body"] == "b"          # 他フィールドは維持
    assert saved["slide_1"]["title"] == "A"         # 他スライドは無変更


async def test_update_slide_cannot_change_id(client):
    p = await create_project(client)
    pid = p["id"]
    await client.patch(f"/projects/{pid}", json={"slides": [{"id": "s1", "order": 1, "title": "T"}]})
    res = await client.patch(f"/projects/{pid}/slides/s1", json={"id": "hacked", "title": "X"})
    assert res.json()["slide"]["id"] == "s1"


async def test_export_import_roundtrip(client):
    p = await create_project(client, raw_content="コンテンツ")
    pid = p["id"]
    structure = {"title": "T", "thesis": "主張", "nodes": []}
    slides = [{"id": "s1", "order": 1, "title": "S"}]
    await client.patch(f"/projects/{pid}", json={"logic_structure": structure, "slides": slides})

    res = await client.get(f"/projects/{pid}/export")
    assert res.status_code == 200
    exported = res.json()
    assert exported["export_version"] == 1
    assert exported["logic_structure"] == structure

    res = await client.post("/projects/import", json=exported)
    assert res.status_code == 200
    imported = res.json()
    assert imported["id"] != pid  # IDは新規発行
    assert imported["title"] == exported["title"]
    assert imported["logic_structure"] == structure
    assert imported["slides"] == slides

    res = await client.get("/projects/")
    assert len(res.json()) == 2


async def test_analyze_requires_content(client):
    p = await create_project(client)
    res = await client.post(f"/projects/{p['id']}/analyze")
    assert res.status_code == 400


async def test_analyze_success(client, monkeypatch):
    structure = {"title": "T", "thesis": "X", "nodes": []}

    async def fake_extract(content):
        return structure

    monkeypatch.setattr("app.api.projects.extract_logic_structure", fake_extract)
    p = await create_project(client, raw_content="本文")
    res = await client.post(f"/projects/{p['id']}/analyze")
    assert res.status_code == 200
    assert res.json()["logic_structure"] == structure

    res = await client.get(f"/projects/{p['id']}")
    assert res.json()["logic_structure"] == structure


async def test_analyze_ai_failure_returns_502(client, monkeypatch):
    async def fake_extract(content):
        raise ValueError("AI応答のJSONパースに失敗")

    monkeypatch.setattr("app.api.projects.extract_logic_structure", fake_extract)
    p = await create_project(client, raw_content="本文")
    res = await client.post(f"/projects/{p['id']}/analyze")
    assert res.status_code == 502
    assert "パースに失敗" in res.json()["detail"]


async def test_generate_slides_requires_structure(client):
    p = await create_project(client, raw_content="本文")
    res = await client.post(f"/projects/{p['id']}/generate-slides")
    assert res.status_code == 400


async def test_generate_slides_success(client, monkeypatch):
    slides = [{"id": "s1", "order": 1, "title": "S", "phase": "jo"}]

    async def fake_generate(structure):
        return slides

    monkeypatch.setattr("app.api.projects.generate_slides_from_structure", fake_generate)
    p = await create_project(client, raw_content="本文")
    await client.patch(f"/projects/{p['id']}", json={"logic_structure": {"nodes": []}})
    res = await client.post(f"/projects/{p['id']}/generate-slides")
    assert res.status_code == 200
    assert res.json()["slides"] == slides


async def test_improve_slide(client, monkeypatch):
    async def fake_improve(slide, instruction):
        return {**slide, "title": "改善済み"}

    monkeypatch.setattr("app.api.projects.improve_slide", fake_improve)
    p = await create_project(client)
    pid = p["id"]
    await client.patch(f"/projects/{pid}", json={"slides": [{"id": "s1", "order": 1, "title": "元"}]})
    res = await client.post(
        f"/projects/{pid}/slides/improve",
        json={"slide_id": "s1", "instruction": "改善して"},
    )
    assert res.status_code == 200
    assert res.json()["slide"]["title"] == "改善済み"

    res = await client.get(f"/projects/{pid}")
    assert res.json()["slides"][0]["title"] == "改善済み"
