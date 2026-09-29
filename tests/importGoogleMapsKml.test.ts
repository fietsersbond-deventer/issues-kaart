import { describe, expect, it, vi } from "vitest";
import { extractKmlIssues, inlineImageUrls } from "../scripts/import-google-maps-kml";

const sampleKml = `<?xml version="1.0"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
<Style id="base-purple"><IconStyle><color>ffb0279c</color></IconStyle></Style>
<StyleMap id="purple"><Pair><key>normal</key><styleUrl>#base-purple</styleUrl></Pair></StyleMap>
<Folder>
  <name>Probleemgebieden</name>
  <Folder><name>Subfolder</name>
    <Placemark><name>G1</name><description><![CDATA[<img src="https://example.com/photo.jpg" /><br>GPS locatie: 5.1, 52.2<br>Wat: dubbele tekst]]></description>
      <styleUrl>#purple</styleUrl>
      <ExtendedData>
        <Data name="Waar"><value>Test &amp; plek</value></Data>
        <Data name="Wat"><value><![CDATA[Een situatie\nmet detail]]></value></Data>
        <Data name="GPS locatie"><value>5.1, 52.2</value></Data>
        <Data name="gx_media_links"><value>photo.jpg</value></Data>
      </ExtendedData>
      <Point><coordinates>5.1,52.2,0</coordinates></Point>
    </Placemark>
    <Placemark><name>G2</name><ExtendedData><Data name="Waar"><value>Geen locatie</value></Data></ExtendedData></Placemark>
  </Folder>
</Folder>
<Folder><name>Knelpunten</name>
  <Placemark><name>A1</name><styleUrl>#purple</styleUrl>
    <ExtendedData>
      <Data name="Waar"><value>Extra kruising</value></Data>
      <Data name="Urgentie"><value>gevaar</value></Data>
    </ExtendedData>
    <Point><coordinates>5.2,52.3,0</coordinates></Point>
  </Placemark>
</Folder></Document></kml>`;

describe("Google Maps KML importer", () => {
  it("reads nested placemarks and uses Waar as title with metadata headings", () => {
    const result = extractKmlIssues(sampleKml);

    expect(result.issues).toHaveLength(2);
    expect(result.issues[0].title).toBe("Test & plek");
    expect(result.issues[0].legendId).toBe("Probleemgebieden:style:purple");
    expect(result.issues[0].geometry).toEqual({
      type: "Point",
      coordinates: [5.1, 52.2, 0],
    });
    expect(result.issues[0].description).toContain("<h3>Waar</h3>");
    expect(result.issues[0].description).toContain("<h3>Wat</h3>");
    expect(result.issues[0].description).toContain("Een situatie");
    expect(result.issues[0].description).toContain('<img src="https://example.com/photo.jpg"');
    expect(result.issues[0].description).not.toContain("<h2>");
    expect(result.issues[0].description).not.toContain("GPS locatie");
    expect(result.issues[0].description).not.toContain("gx_media_links");
    expect(result.issues[0].description).not.toContain("dubbele tekst");
    expect(result.issues[1].title).toBe("Extra kruising");
    expect(result.issues[1].legendId).toBe("Knelpunten:urgency:gevaar");
    expect(result.skipped).toEqual(["Geen locatie: no supported geometry"]);
    expect(result.legends).toEqual([
      {
        id: "Probleemgebieden:style:purple",
        name: "Probleemgebieden",
        color: "#9c27b0",
        styleIds: ["purple"],
      },
      {
        id: "Knelpunten:urgency:gevaar",
        name: "Knelpunten - gevaar",
        color: "#9c27b0",
        styleIds: ["purple"],
      },
    ]);
  });

  it("downloads remote image URLs and stores them as data images", async () => {
    const downloadImage = vi.fn().mockResolvedValue("data:image/jpeg;base64,YWJj");

    const result = await inlineImageUrls(
      '<p>Photo</p><img src="https://example.com/photo.jpg" />',
      downloadImage,
    );

    expect(downloadImage).toHaveBeenCalledWith("https://example.com/photo.jpg");
    expect(result).toContain('src="data:image/jpeg;base64,YWJj"');
  });
});