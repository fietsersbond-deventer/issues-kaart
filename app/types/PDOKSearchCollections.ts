export type PDOKSearchCCollection = {
  relevance: number;
  version: number;
};

export type PDOKSearchCollections = {
  adres: PDOKSearchCCollection;
  gebouw: PDOKSearchCCollection;
  geografisch_gebied: PDOKSearchCCollection;
  inrichtingselement: PDOKSearchCCollection;
  perceel: PDOKSearchCCollection;
  plaats: PDOKSearchCCollection;
  provinciegebied: PDOKSearchCCollection;
  spoorbaandeel: PDOKSearchCCollection;
  waterdeel: PDOKSearchCCollection;
  wegdeel: PDOKSearchCCollection;
  woonplaats: PDOKSearchCCollection;
  gemeentegebied: PDOKSearchCCollection;
  functioneel_gebied: PDOKSearchCCollection;
};
