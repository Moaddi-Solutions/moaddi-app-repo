"use client";

import type { ChatLocation } from "@/(root)/context/chat-context";
import { MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

const TILE_SIZE = 256;
const ZOOM = 15;
const THUMB_WIDTH = 224;
const THUMB_HEIGHT = 112;

/** Standard Web Mercator slippy-map projection: lat/lng -> fractional tile coords at `zoom`. */
function projectToTile(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
    n,
  };
}

/**
 * Stitches the 3x3 OSM tiles around the point and shifts them so the exact
 * coordinate lands in the middle of the crop window — a single tile can't
 * guarantee that since the point can fall anywhere within it, including near
 * an edge.
 *
 * Uses tile.openstreetmap.org directly, which is fine at this volume but is
 * not meant for high-traffic commercial use without a self-hosted or paid
 * tile provider per OSM's tile usage policy — revisit if chat location
 * sharing becomes a heavily-used feature.
 */
function MapThumbnail({ lat, lng }: { lat: number; lng: number }) {
  const { x, y, n } = projectToTile(lat, lng, ZOOM);
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  const pointPxX = (x - tileX) * TILE_SIZE;
  const pointPxY = (y - tileY) * TILE_SIZE;

  const translateX = THUMB_WIDTH / 2 - (TILE_SIZE + pointPxX);
  const translateY = THUMB_HEIGHT / 2 - (TILE_SIZE + pointPxY);

  const tiles = [-1, 0, 1].flatMap((dy) =>
    [-1, 0, 1].map((dx) => {
      const ty = tileY + dy;
      if (ty < 0 || ty >= n) return null;
      const tx = ((tileX + dx) % n + n) % n; // wrap around the antimeridian
      return { key: `${dx},${dy}`, tx, ty, left: (dx + 1) * TILE_SIZE, top: (dy + 1) * TILE_SIZE };
    }),
  ).filter((tile): tile is NonNullable<typeof tile> => tile !== null);

  return (
    <div
      className="relative w-full overflow-hidden bg-muted"
      style={{ height: THUMB_HEIGHT }}
    >
      <div
        className="absolute"
        style={{
          width: TILE_SIZE * 3,
          height: TILE_SIZE * 3,
          transform: `translate(${translateX}px, ${translateY}px)`,
        }}
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={`https://tile.openstreetmap.org/${ZOOM}/${tile.tx}/${tile.ty}.png`}
            alt=""
            aria-hidden="true"
            width={TILE_SIZE}
            height={TILE_SIZE}
            loading="lazy"
            draggable={false}
            className="absolute"
            style={{ left: tile.left, top: tile.top }}
          />
        ))}
      </div>
      <MapPin
        className="absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-full fill-(--chat-bubble-out) text-white drop-shadow"
        aria-hidden="true"
      />
      <span className="absolute right-1 bottom-0.5 rounded bg-black/45 px-1 text-[8px] leading-tight text-white">
        © OpenStreetMap
      </span>
    </div>
  );
}

export function LocationBubble({ location }: { location: ChatLocation }) {
  const t = useTranslations("Chat");
  const locale = useLocale();

  const coordinateFormat = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 5,
  });
  const lat = coordinateFormat.format(location.lat);
  const lng = coordinateFormat.format(location.lng);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
      className="block w-56"
    >
      <MapThumbnail lat={location.lat} lng={location.lng} />
      <span className="flex items-start gap-3 px-3.5 py-2.5">
        <span className="bg-background/60 flex size-9 shrink-0 items-center justify-center rounded-lg">
          <MapPin className="size-4.5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            {t("media.locationTitle")}
          </span>
          {/* dir="ltr": the minus sign and decimal comma must not reorder under
              RTL, or the coordinate reads as a different, wrong position. */}
          <span className="mt-0.5 block text-xs opacity-70" dir="ltr">
            {t("media.locationCoordinates", { lat, lng })}
          </span>
          {location.accuracyM ? (
            <span className="mt-0.5 block text-xs opacity-70">
              {t("media.locationAccuracy", { meters: Math.round(location.accuracyM) })}
            </span>
          ) : null}
          <span className="text-primary-text mt-1 block text-xs font-semibold underline underline-offset-2">
            {t("media.openInMaps")}
          </span>
        </span>
      </span>
    </a>
  );
}
