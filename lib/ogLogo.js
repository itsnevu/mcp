/* Generated from public/BUGGLO.png (96x96, 32-colour). Inlined as a data URI because
   Satori cannot fetch relative asset paths while rendering an OG card, and an absolute
   URL would make every card render depend on the site being reachable.

   Centre the crop on the HEAD, never on the mark's bounding box. The mark is three
   disconnected shapes on its lime field — hat crown (x 326..806), brim + house
   (x 344..885), and the feather (x 770..1046) — so the feather drags the bounding box
   82px right of the head. Centring the bbox therefore lands the head visibly LEFT of
   centre, which is exactly what reads as broken at icon sizes. The head spans x 326..885,
   y 319..891; its centre is (605.5, 605) and that is what every crop below is built on.
   The feather is allowed to overflow to the right — that is what the eye reads as centred.

   Every raster icon comes off these crops. Regenerate them together or they drift apart.
   The lime border supplies the field the two roomier crops reach for past the source edge.

   # tight — public/logo-128, public/logo-512, app/icon.png, app/favicon.ico, and this URI
   magick public/BUGGLO.png -crop 1000x1000+106+105 +repage -resize 96x96 -colors 32 -strip og-logo.png

   # maskable — public/pwa-icon-{192,512}.png. Android masks a maskable icon to a circle
   # of radius 40%: at 1250 the feather tip lands at 200px of the 205px safe radius, so it
   # survives. A tighter crop centred on the head would cut it off.
   magick public/BUGGLO.png -bordercolor '#c6db04' -border 200 -crop 1250x1250+180+180 \
     +repage -resize 512x512 public/pwa-icon-512.png

   # roomy — app/apple-icon.png only; iOS masks to a squircle, so it keeps more margin.
   magick public/BUGGLO.png -bordercolor '#c6db04' -border 200 -crop 1260x1260+176+175 \
     +repage -resize 180x180 app/apple-icon.png */
export const OG_LOGO_DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgBAMAAAAQtmoLAAAAMFBMVEUBP/UBQPQANfUIRPUlWvc6avdJdfe3yPza4/38/P2mu/vM2PxbgviRq/p4mPmBnvsBhFMDAAACoElEQVRYw7WYPWgUQRTHZ1bRQoQ3W1ne3moEsbhObSQG7LRJONA2kKiFElKINjZnI1ieyU4uXIpgiNiqcGJlI2Jn5bUBi4BY2Nm5e7ObnZmbN+/GJX/2OOZufu9j3szj5hgHVkhwIUCwfJQ/onhEJZY/DDhwNdLFmSmuvhfKZvFemsdUGhCsgXgT2BI0thCgRlm79Z9rERxJsJ9ZPVSG+UyAMAWkdWgbosLiUXqzu7razV+5VrorN9r+zONTT6ShbC/2EnMjaetl5MkjGstpvUtw4JJ0aRl1ER86gW3UxQUpw1xcRIA+slDxXQTYRGKKxwiAxQQjDFh3ezjxAgP6SSAwDAU2Q4GsQwPmAsy75nMD2DeARSCBLzQgDOC2GRIJDOboHIykh6nubkBXuh/91YAtug7f4ZoGbCRAAFmHX9aAHqOAjYRFT3V/VEgHwOAqtUgasJMYdUQ2qwZ8LoZwpRquuefXJt9PLHJ2WK0A+IFPZXMU539Mxs8Tr4ePP6PqA0gfFr15oeMGVA7Zs6V2FQG0b72VnuZahfS6pQiefFMfYJ3vKOldlXR0vy6jH8jUeTl7VDjERV0HZbLeGz1OABOTp0O2d97qjE7rign0Izpg3Dij6w5AGGf6AM7pwKuECEn2oq86sEMCw2SkA+4u4GkzskMB8roJOFufAdwzgWUS2CcB4J52PwNgic7B0jy5SqYyCAS2yEpb2g4FeuTWsPQnNId6K8FMQN2NDU8cBdacKbD4DVYFrRvr/SN+gABlNwYbYGcQBwvgDomfdAO76I/p+I5r/ocWYABPx9PxPI48NwJIH/029WvJex+wrxu5WsQlRUwp+KoVAvDA+Sqr0Igg5F5dmIcSO86gCHtWAoF0cDRwLH8HNFsCO4ngpHL9A2wllbtx1K7+AAAAAElFTkSuQmCC";
