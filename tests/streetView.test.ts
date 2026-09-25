import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildEmbedPbUrl,
  buildStreetViewThumbnailUrl,
  fetchThumbnailAsDataUrl,
  parseStreetViewUrl,
  resolveShareLink,
} from "../server/utils/streetView";

// Real example: https://maps.app.goo.gl/jYt6L2FY9H88DzHK8 resolves to this.
const REAL_RESOLVED_URL =
  "https://www.google.com/maps/@52.1833412,6.0548965,10a,75y,49.61h,90t/data=!3m7!1e1!3m5!1sBjdrQCpk2ioh8cKo77VL8A!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fcb_client%3Dmaps_sv.tactile%26w%3D900%26h%3D600%26pitch%3D0%26panoid%3DBjdrQCpk2ioh8cKo77VL8A%26yaw%3D49.60946!7i16384!8i8192!5m1!1e3?entry=tts";

// Real example: https://maps.app.goo.gl/v8HxSYuJbFW1oZuL9 (looking up at the
// Martinitoren) resolves to this - ground-truth pitch from the embedded
// "!6s<thumbnail-url>" is -36.311535975781155, i.e. tilt=126.31 -> pitch=-36.31.
const REAL_RESOLVED_URL_LOOKING_UP =
  "https://www.google.com/maps/@53.2191646,6.5679676,9a,75y,19.01h,126.31t/data=!3m7!1e1!3m5!1s9vwV8LHYJEJOLuGMSzEyDw!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fcb_client%3Dmaps_sv.tactile%26w%3D900%26h%3D600%26pitch%3D-36.311535975781155%26panoid%3D9vwV8LHYJEJOLuGMSzEyDw%26yaw%3D19.013505443528263!7i16384!8i8192";

function fakeResponse(init: {
  status?: number;
  headers?: Record<string, string>;
  arrayBuffer?: () => Promise<ArrayBuffer>;
}) {
  const headerMap = new Map(Object.entries(init.headers ?? {}));
  const status = init.status ?? 200;
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name: string) => headerMap.get(name) ?? null },
    arrayBuffer: init.arrayBuffer ?? (async () => new ArrayBuffer(0)),
  };
}

describe("parseStreetViewUrl", () => {
  it("extracts lat/lng/heading/pitch/fov/panoId from a real resolved share link", () => {
    const result = parseStreetViewUrl(REAL_RESOLVED_URL);
    expect(result).toEqual({
      lat: 52.1833412,
      lng: 6.0548965,
      heading: 49.61,
      pitch: 0,
      fov: 75,
      panoId: "BjdrQCpk2ioh8cKo77VL8A",
    });
  });

  it("rejects a plain map/zoom link (no Street View position) with a clear message", () => {
    const zoomUrl = "https://www.google.com/maps/@52.1833412,6.0548965,15z";
    expect(() => parseStreetViewUrl(zoomUrl)).toThrow(/gewone kaartlocatie/);
  });

  it("computes pitch with the correct sign for a tilt > 90 (looking up)", () => {
    // Regression test: tilt=126.31 must map to pitch=-36.31 (looking up),
    // matching Google's own ground-truth thumbnail pitch, not +36.31.
    const result = parseStreetViewUrl(REAL_RESOLVED_URL_LOOKING_UP);
    expect(result.heading).toBeCloseTo(19.01, 2);
    expect(result.pitch).toBeCloseTo(-36.31, 2);
  });

  it("rejects a URL without any @lat,lng segment", () => {
    const url = "https://www.google.com/maps/search/?api=1&query=bicycle+shop";
    expect(() => parseStreetViewUrl(url)).toThrow(
      /Kon geen Street View gegevens/,
    );
  });

  it("rejects a Street View position URL without a recognizable pano id", () => {
    const url =
      "https://www.google.com/maps/@52.1,6.05,10a,75y,49h,90t/data=!3m1!1e1";
    expect(() => parseStreetViewUrl(url)).toThrow(/foto-id/);
  });
});

describe("buildStreetViewThumbnailUrl", () => {
  it("builds a no-key streetviewpixels thumbnail URL", () => {
    const url = buildStreetViewThumbnailUrl("BjdrQCpk2ioh8cKo77VL8A", 49.61, 0);
    expect(url).toBe(
      "https://streetviewpixels-pa.googleapis.com/v1/thumbnail?cb_client=maps_sv.tactile&w=640&h=400&pitch=0&panoid=BjdrQCpk2ioh8cKo77VL8A&yaw=49.61",
    );
  });
});

describe("buildEmbedPbUrl", () => {
  it("reconstructs a no-key embed URL from parsed params", () => {
    const url = buildEmbedPbUrl({
      lat: 52.1833412,
      lng: 6.0548965,
      heading: 49.61,
      pitch: 0,
      fov: 75,
      panoId: "BjdrQCpk2ioh8cKo77VL8A",
    });
    expect(url).toBe(
      "https://www.google.com/maps/embed?pb=!1m0!3m2!1sen!2sus!4v0!6m8!1m7!1sBjdrQCpk2ioh8cKo77VL8A!2m2!1d52.1833412!2d6.0548965!3f49.61!4f0!5f1",
    );
  });

  it("negates pitch for the embed's 4f field (opposite sign convention from the thumbnail pitch)", () => {
    // params.pitch=-36.31 means "looking up" for the thumbnail; the embed's
    // 4f field must receive +36.31 to also look up instead of down.
    const url = buildEmbedPbUrl({
      lat: 53.2191646,
      lng: 6.5679676,
      heading: 19.01,
      pitch: -36.31,
      fov: 75,
      panoId: "9vwV8LHYJEJOLuGMSzEyDw",
    });
    expect(url).toContain("!4f36.31!");
  });

  it("always uses the widest embed zoom level regardless of the parsed fov (units aren't compatible)", () => {
    const url = buildEmbedPbUrl({
      lat: 1,
      lng: 2,
      heading: 3,
      pitch: 4,
      fov: 120,
      panoId: "abcdefghijklmnopqrst",
    });
    expect(url).toContain("!5f1");
  });
});

describe("resolveShareLink", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("follows a short-link redirect chain to the final Street View URL", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      fakeResponse({
        status: 302,
        headers: {
          location:
            "https://www.google.com/maps/@52.1,6.05,10a,75y,49h,90t/data=!3m1!1e1",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveShareLink(
      "https://maps.app.goo.gl/jYt6L2FY9H88DzHK8",
    );
    expect(result).toBe(
      "https://www.google.com/maps/@52.1,6.05,10a,75y,49h,90t/data=!3m1!1e1",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("recognizes a /maps/place/<name>/@lat,lng,... redirect target as final (no extra fetch)", async () => {
    // Real-world case: some share links redirect straight to a /maps/place/... URL
    // rather than /maps/@...; fetching it again would hit Google's consent redirect.
    const fetchMock = vi.fn().mockResolvedValueOnce(
      fakeResponse({
        status: 302,
        headers: {
          location:
            "https://www.google.com/maps/place/Grote+Markt,+Groningen/@53.2190305,6.5681625,9a,75y,357.05h,121.67t/data=!3m1!1e1",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveShareLink(
      "https://maps.app.goo.gl/buX7DfdPw7ENmLNL7",
    );
    expect(result).toContain(
      "/maps/place/Grote+Markt,+Groningen/@53.2190305,6.5681625,9a,75y,357.05h,121.67t",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an initial URL whose host is not allowlisted", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      resolveShareLink("https://evil.example.com/maps/@1,1,10a"),
    ).rejects.toThrow(/Google Maps links/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a redirect chain that hops to a disallowed host", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      fakeResponse({
        status: 302,
        headers: { location: "https://evil.example.com/phish" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      resolveShareLink("https://maps.app.goo.gl/jYt6L2FY9H88DzHK8"),
    ).rejects.toThrow(/Google Maps links/);
  });

  it("gives up after too many redirect hops", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      fakeResponse({
        status: 302,
        headers: { location: "https://maps.app.goo.gl/jYt6L2FY9H88DzHK8" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      resolveShareLink("https://maps.app.goo.gl/jYt6L2FY9H88DzHK8"),
    ).rejects.toThrow(/omleidingen/);
  });
});

describe("fetchThumbnailAsDataUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the thumbnail and returns it as a data URL", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]).buffer;
    const fetchMock = vi.fn().mockResolvedValueOnce(
      fakeResponse({
        status: 200,
        headers: { "content-type": "image/jpeg", "content-length": "4" },
        arrayBuffer: async () => bytes,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchThumbnailAsDataUrl(
      "https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=abc",
    );
    expect(result).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("rejects a thumbnail URL on a different host", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchThumbnailAsDataUrl(
        "https://evil.example.com/v1/thumbnail?panoid=abc",
      ),
    ).rejects.toThrow(/Ongeldige bron/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a non-image response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        fakeResponse({ status: 200, headers: { "content-type": "text/html" } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchThumbnailAsDataUrl(
        "https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=abc",
      ),
    ).rejects.toThrow(/bestandstype/);
  });
});
