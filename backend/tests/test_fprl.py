ANALYSIS = {
    "reader_before": {"foundation": "資料作りは手作業が当然", "behavior": "毎回ゼロから作る"},
    "reader_after": {"foundation": "構造から自動生成できる", "behavior": "ツールで構造化してから展開する"},
    "stages": [
        {"id": "E1", "status": "ok", "evidence": "冒頭の問いかけ", "comment": "差分を作れている"},
        {"id": "E2", "status": "weak", "evidence": "", "comment": "自分ごと化が弱い"},
        {"id": "R", "status": "ok", "evidence": "理由の説明", "comment": "因果は明確"},
        {"id": "E3", "status": "missing", "evidence": "", "comment": "抵抗を下げる要素がない"},
        {"id": "L", "status": "ok", "evidence": "CTA", "comment": "次の一歩がある"},
    ],
    "gaps": [
        {"stage": "E3", "issue": "証拠がなく既存の基準を手放せない", "fix": "事例か実績を追加する"},
    ],
    "verdict": "E3が最優先の修正ポイント",
}


async def create_project(client, **kwargs):
    res = await client.post("/projects/", json={"title": "FPRL", **kwargs})
    return res.json()


async def test_stages_endpoint(client):
    res = await client.get("/projects/x/fprl/stages")
    assert res.status_code == 200
    ids = [s["id"] for s in res.json()["stages"]]
    assert ids == ["E1", "E2", "R", "E3", "L"]


async def test_analyze_requires_content(client):
    p = await create_project(client)
    res = await client.post(f"/projects/{p['id']}/fprl/analyze")
    assert res.status_code == 400


async def test_analyze_stores_and_persists(client, monkeypatch):
    captured = {}

    async def fake_analyze(content, profile=None):
        captured["content"] = content
        captured["profile"] = profile
        return dict(ANALYSIS)

    monkeypatch.setattr("app.api.fprl.analyze_fprl", fake_analyze)
    p = await create_project(client, raw_content="本文")
    profile = {"product_name": "X", "target_audience": "読者", "goal": "登録", "tone": ""}
    await client.put(f"/projects/{p['id']}/marketing/profile", json=profile)

    res = await client.post(f"/projects/{p['id']}/fprl/analyze")
    assert res.status_code == 200
    assert res.json()["analysis"]["gaps"][0]["stage"] == "E3"
    assert captured["profile"] == profile  # プロファイルが審査に渡る

    res = await client.get(f"/projects/{p['id']}")
    stored = res.json()["assets"]["fprl_analysis"]
    assert stored["reader_before"]["foundation"] == "資料作りは手作業が当然"
    assert stored["analyzed_at"]


async def test_analyze_uses_structure_when_no_content(client, monkeypatch):
    captured = {}

    async def fake_analyze(content, profile=None):
        captured["content"] = content
        return dict(ANALYSIS)

    monkeypatch.setattr("app.api.fprl.analyze_fprl", fake_analyze)
    p = await create_project(client)
    await client.patch(f"/projects/{p['id']}", json={"logic_structure": {
        "title": "構造T", "thesis": "主張", "nodes": []}})
    res = await client.post(f"/projects/{p['id']}/fprl/analyze")
    assert res.status_code == 200
    assert "構造T" in captured["content"]


async def test_analyze_ai_failure_returns_502(client, monkeypatch):
    async def broken(content, profile=None):
        raise ValueError("AI応答が想定形式ではありません")

    monkeypatch.setattr("app.api.fprl.analyze_fprl", broken)
    p = await create_project(client, raw_content="本文")
    res = await client.post(f"/projects/{p['id']}/fprl/analyze")
    assert res.status_code == 502
