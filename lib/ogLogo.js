/* Generated from public/bugglo.png, the Bugglo wordmark logo — a white "B" with a
   four-point spark counter on a royal-blue (#1D4ED8) field. It is a full-bleed square
   mark (no border, no separate lime field), so every raster icon is a straight resize of
   the source; there is no head/feather crop to centre any more.

   Inlined as a data URI because Satori cannot fetch relative asset paths while rendering
   an OG card, and an absolute URL would make every card render depend on the site being
   reachable.

   Regenerate this URI and the raster icons together from the same source so they never
   drift apart:

   # this URI (96x96, 32-colour, tight)
   magick public/bugglo.png -resize 96x96 -colors 32 -strip og-logo.png

   # public/logo-128.png, public/logo-512.png, app/icon.png, app/favicon.ico
   magick public/bugglo.png -resize 512x512 public/logo-512.png

   # maskable / apple — public/pwa-icon-{192,512}.png, app/apple-icon.png
   magick public/bugglo.png -resize 512x512 public/pwa-icon-512.png */
export const OG_LOGO_DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgBAMAAAAQtmoLAAAAMFBMVEUBP/UBQPQANfUIRPUlWvc6avdJdfe3yPza4/38/P2mu/vM2PxbgviRq/p4mPmBnvsBhFMDAAACoElEQVRYw7WYPWgUQRTHZ1bRQoQ3W1ne3moEsbhObSQG7LRJONA2kKiFElKINjZnI1ieyU4uXIpgiNiqcGJlI2Jn5bUBi4BY2Nm5e7ObnZmbN+/GJX/2OOZufu9j3szj5hgHVkhwIUCwfJQ/onhEJZY/DDhwNdLFmSmuvhfKZvFemsdUGhCsgXgT2BI0thCgRlm79Z9rERxJsJ9ZPVSG+UyAMAWkdWgbosLiUXqzu7razV+5VrorN9r+zONTT6ShbC/2EnMjaetl5MkjGstpvUtw4JJ0aRl1ER86gW3UxQUpw1xcRIA+slDxXQTYRGKKxwiAxQQjDFh3ezjxAgP6SSAwDAU2Q4GsQwPmAsy75nMD2DeARSCBLzQgDOC2GRIJDOboHIykh6nubkBXuh/91YAtug7f4ZoGbCRAAFmHX9aAHqOAjYRFT3V/VEgHwOAqtUgasJMYdUQ2qwZ8LoZwpRquuefXJt9PLHJ2WK0A+IFPZXMU539Mxs8Tr4ePP6PqA0gfFr15oeMGVA7Zs6V2FQG0b72VnuZahfS6pQiefFMfYJ3vKOldlXR0vy6jH8jUeTl7VDjERV0HZbLeGz1OABOTp0O2d97qjE7rign0Izpg3Dij6w5AGGf6AM7pwKuECEn2oq86sEMCw2SkA+4u4GkzskMB8roJOFufAdwzgWUS2CcB4J52PwNgic7B0jy5SqYyCAS2yEpb2g4FeuTWsPQnNId6K8FMQN2NDU8cBdacKbD4DVYFrRvr/SN+gABlNwYbYGcQBwvgDomfdAO76I/p+I5r/ocWYABPx9PxPI48NwJIH/029WvJex+wrxu5WsQlRUwp+KoVAvDA+Sqr0Igg5F5dmIcSO86gCHtWAoF0cDRwLH8HNFsCO4ngpHL9A2wllbtx1K7+AAAAAElFTkSuQmCC";
