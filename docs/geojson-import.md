# Kaartgegevens importeren

Beheerders kunnen onder **Beheer → Importeren** kaartgegevens als onderwerpen
toevoegen. Daarna zijn het gewone onderwerpen die je op de kaart kunt bewerken.

Ondersteunde bestanden (maximaal 25 MB):

- **KMZ/KML**, bijvoorbeeld een export uit Google My Maps
- **GeoJSON** (`.geojson` of `.json`): een FeatureCollection met coördinaten in
  lengte- en breedtegraden (WGS84)

Het bestand wordt in de browser ingelezen. Pas bij de laatste stap wordt er iets
opgeslagen.

## Overstappen vanuit Google My Maps

1. Open de kaart in Google My Maps en kies in het menu **Exporteren naar KML/KMZ**.
   Kies de hele kaart en laat **Exporteren als KML** uit; je krijgt dan een KMZ-bestand.
2. Importeer het KMZ-bestand en controleer het resultaat op de kaart.
3. Verwijder de Google-kaart pas daarna. Foto's worden tijdens de import
   gedownload en in de onderwerpen opgeslagen, maar alleen zolang de Google-kaart
   nog bestaat.

## Stappen

1. **Bestand**: kies het bestand. Je ziet hoeveel objecten een geometrie hebben.
   Objecten zonder geometrie worden overgeslagen.
2. **Instellingen**
   - **Standaardtitel**: voor objecten zonder waarde in het titelveld.
   - **Standaardbeschrijving** (optioneel): alleen voor objecten zonder eigen
     beschrijving, dus zonder HTML-veld en zonder ingevulde velden.
   - **Gegevensveld voor titel**: bijvoorbeeld `name`. Objecten zonder waarde
     krijgen de standaardtitel.
   - **Gegevensveld voor categorie**: het veld dat bepaalt in welke categorie een
     object komt. Bij KML/KMZ is dat standaard `folder`: de laag in Google My Maps.
     Zonder veld komen alle objecten in één categorie.
   - **Gegevensveld met HTML-opmaak**: wordt met opmaak en afbeeldingen
     overgenomen. Bij KML/KMZ is dat standaard `description`.
   - **Velden in de beschrijving**: elk aangevinkt veld komt als kopje met tekst in
     de beschrijving. Lege waarden worden overgeslagen.
3. **Categorieën**: koppel elke waarde van het categorieveld aan een bestaande
   categorie of maak een nieuwe aan met naam en kleur. Vink waarden uit die je niet
   wilt importeren. Er wordt niets automatisch gekoppeld.
4. **Importeren**: je ziet hoeveel onderwerpen en nieuwe categorieën er komen.
   Externe afbeeldingen worden gedownload. Mislukt een download, dan kun je het
   opnieuw proberen of importeren zonder die afbeeldingen. Afbeeldingen in een
   KMZ-bestand zelf hoeven niet gedownload te worden.

## Goed om te weten

- Een object met meerdere geometrieën (bijvoorbeeld een MultiLineString) wordt
  gesplitst in meerdere onderwerpen met dezelfde titel en beschrijving.
- Hoogtes in coördinaten worden weggelaten.
- Afbeeldingen worden verkleind tot maximaal 1000×1000 pixels (JPEG) en in de
  beschrijving opgeslagen, net als afbeeldingen die je zelf in een onderwerp
  plakt. Een afbeelding mag vooraf maximaal 50 MB zijn.
- De afbeeldingen worden in stap 4 één voor één op de server verwerkt en daar
  tijdelijk bewaard tot de import. Wacht je langer dan zes uur met importeren,
  dan moet je ze opnieuw laten verwerken (ga terug en weer verder).
- Alle onderwerpen van één import krijgen dezelfde tag, bijvoorbeeld
  `import-20261128-1530`. Het label van de tag noemt het bestand en het tijdstip.
  Filter op de kaart of in de lijst op die tag om de import terug te vinden.
- Opnieuw importeren voegt nieuwe onderwerpen toe, met een nieuwe tag. Bestaande
  onderwerpen worden niet bijgewerkt of vervangen.
- Andere gebruikers zien één melding met het aantal geïmporteerde onderwerpen.
- Andere tags worden (nog) niet uit het bestand overgenomen.
