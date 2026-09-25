/**
 * Zorgt voor de "consent-gated" weergave van `.streetview-embed`
 * placeholders die in een omschrijving van een issue zijn opgeslagen: legt
 * een "klik om te laden"-knop over de al opgeslagen, statische
 * voorvertoning heen, en bouwt pas een écht (live) Google-iframe op zodra de
 * bezoeker daar zelf op klikt.
 *
 * Waarom dit los van Vue's eigen templating gebeurt: de omschrijving wordt
 * via `v-html` gerenderd (het is opgeslagen, opgeschoonde HTML uit de
 * database, geen Vue-template) - Vue "ziet" die inhoud dus niet en kan er
 * geen component-logica aan hangen. Deze composable doet daarom handmatig
 * DOM-werk (querySelectorAll, createElement, event-afhandeling) op de al
 * gerenderde HTML, wat voor dit specifieke geval (v-html content) de enige
 * bruikbare aanpak is.
 */
export function useStreetViewEmbeds() {
  /**
   * Doorzoekt de meegegeven container op nog niet "verrijkte"
   * streetview-embed-placeholders en voegt daar een overlay-knop aan toe.
   * De opgeslagen voorvertoning-afbeelding zelf blijft gewoon zichtbaar
   * (en blijft dus ook bruikbaar als OG-/hover-voorvertoning elders in de
   * app, via het bestaande extractImageUrl-mechanisme).
   *
   * `data-enhanced` voorkomt dat we dezelfde placeholder twee keer verrijken
   * (bijv. wanneer deze functie opnieuw draait na een DOM-update).
   */
  function activate(container: HTMLElement) {
    const embeds = container.querySelectorAll<HTMLElement>(
      "div.streetview-embed[data-embed-src]:not([data-enhanced])",
    );

    embeds.forEach((embed) => {
      embed.dataset.enhanced = "true";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "streetview-load-btn";
      button.setAttribute("aria-label", "Klik om Street View te laden");
      button.innerHTML =
        '<span class="mdi mdi-google-street-view" aria-hidden="true"></span>' +
        "<span>Klik om Street View te laden</span>";
      embed.appendChild(button);
    });
  }

  /**
   * Klik-handler die op de omschrijving-container gezet moet worden (samen
   * met eventuele andere click-handlers, zoals het afhandelen van interne
   * links). Bij een klik op een nog niet geladen streetview-embed wordt het
   * live, interactieve Google-iframe pas nú aangemaakt en ingevoegd - dit is
   * hét moment waarop de bezoeker bewust toestemming geeft om contact te
   * maken met Google.
   */
  function handleClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const embed = target.closest<HTMLElement>(".streetview-embed");
    const embedSrc = embed?.dataset.embedSrc;
    if (!embed || !embedSrc || embed.dataset.loaded === "true") {
      // Geen (geldige) streetview-embed geraakt, of al geladen: niets doen.
      return;
    }

    event.preventDefault();

    const iframe = document.createElement("iframe");
    iframe.src = embedSrc;
    iframe.width = "100%";
    iframe.height = "400";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.title = "Street View";
    iframe.style.border = "0";

    // Vervangt de statische voorvertoning (afbeelding + overlay-knop) volledig
    // door het live iframe - dus niet ernaast/eronder plaatsen.
    embed.replaceChildren(iframe);
    embed.dataset.loaded = "true";
  }

  return { activate, handleClick };
}
