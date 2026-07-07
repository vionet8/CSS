"""プロファイル審査と外部素材の取り込み・分解・散りばめのテスト。"""


async def create_project(client, **kwargs):
    res = await client.post("/projects/", json={"title": "審査テスト", **kwargs})
    assert res.status_code == 200
    return res.json()


AUDIT_RESULT = {
    "extracted": {
        "product_name": "Future Compass",
        "target_audience": "キャリアに悩む20代",
        "goal": "",
        "tone": "前向き",
    },
    "findings": [
        {"field": "product_name", "status": "ok", "comment": "明記されている"},
        {"field": "target_audience", "status": "weak", "comment": "絞りが甘い"},
        {"field": "goal", "status": "missing", "comment": "CTAが読み取れない"},
        {"field": "tone", "status": "ok", "comment": "一貫している"},
    ],
    "questions": ["読者に最終的に取ってほしい行動は何ですか？"],
    "verdict": "ゴールを決めてから公開すべき",
    "audited_at": "2026-07-07T00:00:00+00:00",
}


def fake_fragments(n=2, source="チャッピー"):
    return [
        {
            "id": f"frag_{source}_{i}",
            "kind": "ベネフィット",
            "text": f"断片{i}",
            "source": source,
            "created_at": "2026-07-07T00:00:00+00:00",
        }
        for i in range(n)
    ]


# ---- プロファイル審査 ----


async def test_audit_requires_content(client):
    p = await create_project(client)
    res = await client.post(f"/projects/{p['id']}/marketing/profile/audit")
    assert res.status_code == 400


async def test_audit_returns_and_persists_result(client, monkeypatch):
    captured = {}

    async def fake_audit(content, current_profile=None):
        captured["content"] = content
        captured["profile"] = current_profile
        return AUDIT_RESULT

    monkeypatch.setattr("app.api.marketing.audit_profile_from_content", fake_audit)
    p = await create_project(client, raw_content="LPテキスト")
    profile = {"product_name": "", "target_audience": "", "goal": "登録", "tone": ""}
    await client.put(f"/projects/{p['id']}/marketing/profile", json=profile)

    res = await client.post(f"/projects/{p['id']}/marketing/profile/audit")
    assert res.status_code == 200
    audit = res.json()["audit"]
    assert audit["extracted"]["target_audience"] == "キャリアに悩む20代"
    assert len(audit["questions"]) == 1
    assert captured["content"] == "LPテキスト"
    assert captured["profile"]["goal"] == "登録"  # 既存プロファイルが審査に渡る

    # 審査結果が保存されている
    res = await client.get(f"/projects/{p['id']}")
    assert res.json()["assets"]["profile_audit"]["verdict"] == "ゴールを決めてから公開すべき"


# ---- 素材の取り込み・分解 ----


async def test_import_material_rejects_empty(client):
    p = await create_project(client)
    res = await client.post(
        f"/projects/{p['id']}/marketing/materials", json={"text": "   "}
    )
    assert res.status_code == 400


async def test_import_material_appends_fragments(client, monkeypatch):
    calls = []

    async def fake_decompose(text, source_name=""):
        calls.append(source_name)
        return fake_fragments(2, source_name or "s")

    monkeypatch.setattr("app.api.marketing.decompose_material", fake_decompose)
    p = await create_project(client)
    pid = p["id"]

    res = await client.post(
        f"/projects/{pid}/marketing/materials",
        json={"text": "チャッピー製の素材", "source_name": "gpt1"},
    )
    assert res.status_code == 200
    assert res.json()["total"] == 2

    # 2回目の取り込みは追記される（上書きしない）
    res = await client.post(
        f"/projects/{pid}/marketing/materials",
        json={"text": "追加素材", "source_name": "gpt2"},
    )
    assert res.json()["total"] == 4

    res = await client.get(f"/projects/{pid}")
    fragments = res.json()["assets"]["material_fragments"]
    assert len(fragments) == 4
    assert {f["source"] for f in fragments} == {"gpt1", "gpt2"}


async def test_delete_fragment(client, monkeypatch):
    async def fake_decompose(text, source_name=""):
        return fake_fragments(2, "src")

    monkeypatch.setattr("app.api.marketing.decompose_material", fake_decompose)
    p = await create_project(client)
    pid = p["id"]
    res = await client.post(
        f"/projects/{pid}/marketing/materials", json={"text": "素材"}
    )
    frag_id = res.json()["fragments"][0]["id"]

    res = await client.delete(f"/projects/{pid}/marketing/materials/{frag_id}")
    assert res.status_code == 200
    assert res.json()["total"] == 1

    res = await client.delete(f"/projects/{pid}/marketing/materials/{frag_id}")
    assert res.status_code == 404


# ---- 散りばめ（分析・素材生成への注入） ----


async def test_fragments_injected_into_analyze(client, monkeypatch):
    captured = {}

    async def fake_decompose(text, source_name=""):
        return fake_fragments(3)

    async def fake_extract(content, framework, profile=None, fragments=None):
        captured["fragments"] = fragments
        return {"title": "T", "thesis": "X", "nodes": [], "framework": framework}

    monkeypatch.setattr("app.api.marketing.decompose_material", fake_decompose)
    monkeypatch.setattr("app.api.marketing.extract_marketing_structure", fake_extract)
    p = await create_project(client, raw_content="本文")
    await client.post(f"/projects/{p['id']}/marketing/materials", json={"text": "素材"})

    res = await client.post(
        f"/projects/{p['id']}/marketing/analyze", json={"framework": "pasona"}
    )
    assert res.status_code == 200
    assert len(captured["fragments"]) == 3


async def test_fragments_injected_into_asset_generation(client, monkeypatch):
    captured = {}

    async def fake_decompose(text, source_name=""):
        return fake_fragments(2)

    async def fake_generate(source, asset_type, profile=None, fragments=None):
        captured["fragments"] = fragments
        return {"type": asset_type, "label": "L", "variants": [{"title": "", "text": "x"}],
                "generated_at": "2026-07-07T00:00:00+00:00"}

    monkeypatch.setattr("app.api.marketing.decompose_material", fake_decompose)
    monkeypatch.setattr("app.api.marketing.generate_marketing_asset", fake_generate)
    p = await create_project(client, raw_content="本文")
    await client.post(f"/projects/{p['id']}/marketing/materials", json={"text": "素材"})

    res = await client.post(
        f"/projects/{p['id']}/marketing/assets", json={"asset_type": "x_post"}
    )
    assert res.status_code == 200
    assert len(captured["fragments"]) == 2


def test_fragments_block_prompt():
    from app.services.marketing_service import _fragments_block

    assert _fragments_block(None) == ""
    assert _fragments_block([]) == ""
    block = _fragments_block([{"kind": "根拠・実績", "text": "利用者1万人"}])
    assert "[根拠・実績] 利用者1万人" in block
