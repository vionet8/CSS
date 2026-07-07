import io
from PIL import Image


def make_png(width=100, height=60) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), (200, 50, 50)).save(buf, format="PNG")
    return buf.getvalue()


async def upload(client, data: bytes = None, name="test.png", mime="image/png"):
    return await client.post(
        "/images/upload",
        files={"file": (name, data if data is not None else make_png(), mime)},
    )


async def test_upload_and_get(client):
    res = await upload(client)
    assert res.status_code == 200
    info = res.json()
    assert info["width"] == 100
    assert info["height"] == 60

    res = await client.get(f"/images/file/{info['filename']}")
    assert res.status_code == 200


async def test_upload_rejects_non_image_extension(client):
    res = await upload(client, name="evil.exe")
    assert res.status_code == 400


async def test_upload_rejects_corrupt_image(client):
    res = await upload(client, data=b"not an image")
    assert res.status_code == 400


async def test_get_missing_image_returns_404(client):
    res = await client.get("/images/file/nonexistent.png")
    assert res.status_code == 404


async def test_path_traversal_rejected(client):
    """ファイル名に親ディレクトリ参照を含むリクエストは拒否される。"""
    for bad in ["../secret.png", "..\\secret.png", "a/../b.png", ".hidden.png"]:
        res = await client.post("/images/resize", json={"filename": bad, "width": 10, "height": 10})
        assert res.status_code == 400, bad
        res = await client.post("/images/crop", json={"filename": bad, "x": 0, "y": 0, "width": 10, "height": 10})
        assert res.status_code == 400, bad
        res = await client.post("/images/split", json={"filename": bad, "count": 4})
        assert res.status_code == 400, bad


async def test_resize_validates_dimensions(client):
    info = (await upload(client)).json()
    res = await client.post("/images/resize", json={"filename": info["filename"], "width": 0, "height": 10})
    assert res.status_code == 422
    res = await client.post("/images/resize", json={"filename": info["filename"], "width": 50, "height": 30})
    assert res.status_code == 200
    assert res.json()["width"] == 50


async def test_resize_missing_file_returns_404(client):
    res = await client.post("/images/resize", json={"filename": "ghost.png", "width": 10, "height": 10})
    assert res.status_code == 404


async def test_split_image(client):
    info = (await upload(client)).json()
    res = await client.post("/images/split", json={"filename": info["filename"], "count": 4})
    assert res.status_code == 200
    assert len(res.json()) == 4

    res = await client.post("/images/split", json={"filename": info["filename"], "count": 5})
    assert res.status_code == 400
