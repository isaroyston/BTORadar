import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { BtoProject } from "../policies/policyConfig";
import { Icon } from "./DashboardUi";

// OneMap's own tiles (Singapore Land Authority), free and keyless, with the credit OneMap asks for.
const TILES = "https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png";
const CREDIT =
  '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noreferrer">OneMap</a> &copy; contributors | <a href="https://www.sla.gov.sg/" target="_blank" rel="noreferrer">Singapore Land Authority</a>';
const SINGAPORE: [[number, number], [number, number]] = [
  [1.144, 103.535],
  [1.494, 104.502],
];
const PIN =
  '<svg viewBox="0 0 32 40" width="32" height="40" aria-hidden="true"><path d="M16 39s13-12.4 13-23A13 13 0 0 0 3 16c0 10.6 13 23 13 23Z" fill="oklch(57% 0.21 15)" stroke="white" stroke-width="2.5"/><circle cx="16" cy="16" r="5" fill="white"/></svg>';

/**
 * A map of the site people can pan and zoom. Leaflet loads only when a project sheet opens,
 * so the list and the other screens don't pay for it.
 */
export function SiteMap({ project }: { project: BtoProject }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const point = project.projectCoordinates;
  const lat = point?.lat;
  const lon = point?.lon;

  useEffect(() => {
    if (lat === undefined || lon === undefined || !container.current) return;
    let map: LeafletMap | null = null;
    let cancelled = false;
    let resize: number | undefined;

    Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")])
      .then(([module]) => {
        const L = module.default ?? module;
        if (cancelled || !container.current) return;
        map = L.map(container.current, {
          center: [lat, lon],
          zoom: 16,
          minZoom: 12,
          maxZoom: 19,
          maxBounds: SINGAPORE,
          // The sheet scrolls: wheel and one-finger drags scroll it, not the map.
          scrollWheelZoom: "center",
          dragging: !L.Browser.mobile,
        });
        map.scrollWheelZoom.disable();
        map.on("focus click", () => map?.scrollWheelZoom.enable());
        map.on("blur mouseout", () => map?.scrollWheelZoom.disable());
        L.tileLayer(TILES, { minZoom: 11, maxZoom: 19, detectRetina: true, attribution: CREDIT }).addTo(map);
        L.marker([lat, lon], {
          icon: L.divIcon({ className: "site-pin", html: PIN, iconSize: [32, 40], iconAnchor: [16, 39] }),
          title: project.name,
          keyboard: false,
        }).addTo(map);
        map.attributionControl.setPrefix(false);
        // The sheet slides in, so measure again once it has settled.
        resize = window.setTimeout(() => map?.invalidateSize(), 320);
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      window.clearTimeout(resize);
      map?.remove();
    };
  }, [lat, lon, project.name]);

  if (lat === undefined || lon === undefined) return null;

  return (
    <div className="site-map">
      {failed ? (
        <p className="site-map-failed">The map couldn't load.</p>
      ) : (
        <div ref={container} className="site-map-canvas" role="region" aria-label={`Map around ${project.name}`} />
      )}
      <p className="site-map-foot">
        <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`} target="_blank" rel="noreferrer">
          Open in Google Maps
          <Icon name="external" />
        </a>
      </p>
    </div>
  );
}
