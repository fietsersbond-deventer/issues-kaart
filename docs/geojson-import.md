# Kaartgegevens importeren voor je afdeling

Beheerders kunnen onder **Beheer → GeoJSON importeren** kaartgegevens toevoegen.
Dit werkt voor elke afdeling en is niet afhankelijk van een gemeente of leverancier.
Je kunt bijvoorbeeld fietsroutes, oversteekplaatsen of een eigen inventarisatie importeren.

1. **Bron:** kies een `.geojson`- of `.json`-bestand van maximaal 25 MB. Het moet een GeoJSON FeatureCollection zijn met lengte- en breedtegraden in WGS84 (EPSG:4326). Vraag de leverancier om dit formaat of exporteer het met een GIS-programma als je bestand een ander formaat of coördinatenstelsel gebruikt.
2. **Instellingen:** geef een standaardtitel en beschrijving op. Vermeld bijvoorbeeld de bron en datum. Je kunt een gegevensveld uit het bestand kiezen voor de titel per melding, bijvoorbeeld `straatnaam` of `route`.
3. **Lagen en import:** controleer de aantallen, vink de gewenste lagen aan en kies per laag een bestaande of nieuwe categorie. Pas daarna worden de meldingen en eventuele nieuwe categorieën opgeslagen.

## Lagen en categorieën kiezen

Bij **Categorie-indeling** kun je één categorie voor alle objecten gebruiken of
zelf een gegevensveld kiezen. Elke unieke waarde in dat veld wordt een laag in
het importvoorbeeld. Heeft het veld `type` bijvoorbeeld de waarden `Fietspad` en
`Oversteekplaats`, dan kun je beide lagen apart selecteren en aan categorieën koppelen.
Ontbrekende en lege waarden verschijnen als aparte groepen.

De import leidt geen lagen af uit de naam van het bestand of uit regels van een
bepaalde bron. Als je bestand geen geschikt veld bevat, kies dan één categorie
of laat de leverancier eerst een indeling toevoegen. Als verschillende soorten
gegevens in afzonderlijke bestanden staan, importeer je die bestanden apart.

## Lijnsegmenten samenvoegen

Samenvoegen staat standaard uit. Schakel het in als je bijvoorbeeld losse stukken
van dezelfde weg als één lijn wilt beheren. Kies zelf het gegevensveld dat de weg
of route identificeert. Alleen lijnen met dezelfde veldwaarde, categorie en overige
attributen worden samengevoegd als hun eindpunten exact aansluiten. Vertakkingen,
gaten en segmenten zonder identificerende waarde blijven apart. Punten en vlakken
veranderen niet.

## Na de import

Alle geïmporteerde objecten zijn op de gebruikelijke manier te bewerken op de kaart.
Meervoudige geometrieën kunnen meerdere meldingen opleveren; controleer daarom het
importvoorbeeld. Teruggaan tussen stappen bewaart je invoer. Wijzig je de instellingen,
dan wordt het voorbeeld opnieuw berekend. Opnieuw importeren voegt nieuwe meldingen
toe en vervangt eerdere imports niet.
