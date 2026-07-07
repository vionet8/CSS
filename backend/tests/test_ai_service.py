import pytest
from app.services import ai_service
from app.services.ai_service import _parse_ai_json


def test_parse_plain_json():
    assert _parse_ai_json('{"a": 1}', r"\{[\s\S]*\}", "t") == {"a": 1}


def test_parse_strips_code_block():
    raw = '```json\n{"a": 1}\n```'
    assert _parse_ai_json(raw, r"\{[\s\S]*\}", "t") == {"a": 1}


def test_parse_extracts_json_from_prose():
    raw = 'はい、こちらが結果です:\n[{"id": "s1"}]\n以上です'
    assert _parse_ai_json(raw, r"\[[\s\S]*\]", "t") == [{"id": "s1"}]


def test_parse_repairs_broken_json():
    # 末尾カンマ・引用符の欠落を json_repair が修復できる
    raw = '{"title": "テスト", "items": [1, 2,]}'
    result = _parse_ai_json(raw, r"\{[\s\S]*\}", "t")
    assert result["title"] == "テスト"


async def test_garbage_response_raises(monkeypatch):
    # json_repair はガベージ文字列も「修復」してしまうため、
    # 呼び出し側の型検証で ValueError になることを確認する
    async def fake_call(prompt, max_tokens=4096):
        return "これはJSONではありません"

    monkeypatch.setattr(ai_service, "_call_claude", fake_call)
    with pytest.raises(ValueError):
        await ai_service.extract_logic_structure("テスト")
    with pytest.raises(ValueError):
        await ai_service.generate_slides_from_structure({"nodes": []})


async def test_improve_slide_preserves_id_and_order(monkeypatch):
    async def fake_call(prompt, max_tokens=4096):
        return '{"id": "wrong_id", "order": 99, "title": "改善後"}'

    monkeypatch.setattr(ai_service, "_call_claude", fake_call)
    original = {"id": "s1", "order": 3, "title": "元"}
    improved = await ai_service.improve_slide(original, "改善")
    assert improved["id"] == "s1"
    assert improved["order"] == 3
    assert improved["title"] == "改善後"


async def test_missing_api_key_raises_clear_error(monkeypatch):
    monkeypatch.setattr(ai_service.settings, "ANTHROPIC_API_KEY", "")
    with pytest.raises(ValueError, match="ANTHROPIC_API_KEY"):
        await ai_service.extract_logic_structure("テスト")
