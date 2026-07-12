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
export const OG_LOGO_DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAMAAADVRocKAAAAM1BMVEXG2QPI2gPF1wLS5gG3yAOKlgdrdAl6hAibqAVLUQwREBEtLw+ntgQfIA9cYwo+Qg3j+AApJX9XAAAF9klEQVRo3rVai5KkKgwlAUREmf7/r11AgYSH2n3rUrWzXT1wTt5AGCHCgPQj/ZyM/DvE8I/+AkX+AofrgC1/gg/4cTD4CAGVfbaS0N2xNQSYFsWRliGi+HVQHbh96IwnfOqFKBXAk+3o7DcismnAV92qDyOG6h3I//i0wZJ32ncBmayR1r+2SWfveXxAiQPKDnxpvxJZ8Hds3JutBWGsClKi7JKRMaAJl27eIH46vovgTAEuIlxG6Rdf304CYszQ24Br0ABWgs5oA4MhJbhTODPmWUXrsgwqD/YJ29mjFQdKnp1UUMdYkha91Rn6/xhutepd9lDxqKvLOqJ2kYEaa5j+2cFYwxSg6H/BtCrWoGqsMmUI6MQPUJigLoL6CQQ1fbtqRiCarUcAwct8NEZYchBm4iJCEOBBhlEUISEx1jt7t/UpTAgkKL2YFWSbCzDwAfX2fdDkvVfK1W5xuF3mkiFK2M2qDDTZNg8huZ/wcawS6dy6x3TJloMYGl7Bo1oE45utjkOxJOM7WOuCGmmiz7OCD36jw54qPJ584ArdzD+qFAkf/zY+khvG28fAAPTzaJFUrsHffCDoRQmeGjkTprmV5e/wtwOhs1GIY7krYM4oxWIGHsYI/wokNk9K1NapEhfcG+TACiy5giXsAH9bKEEsH3L3QRAtcXgIquWRsOMpmB/hn3GUpMEYxHiGWVXgMhDU4KFHUergZYi/uSxZMKFU3vter6xCjc1BgMp1jB9zDc+4QdCBjyRgP7pExuuGgUIdE4Jth1RehXYmzYk/tHx3lM8HuKkDchhJQLsdUfrDHYfV8haVf8a4fGqgRCDkqs8K5Wwgcf6mdPAbxrm1wL6DmxPoj9o3n6T3NhlJD64jWCArC6a4i1Gtljm+B2Nt8q1fTjEGBprmL6BPGFMPh3j0m4u/tsYmGxnFU+zOwbm43SiwyGtz09cci5PyOvA1whmbHqf49mNjWDqjgySHtXZRIpu3DZi+TuMl3VyBI1nwMNcm6lYpYXwpGV4BpD6lpB5wf37R667i2FeF1h12PQVwfh1clet5piXBrMCqL/C/ZVUAqFatzbIYY9Z1F4Cf3TnrzR7KNEzEHe1IIQH2UzB5hngAV+tiHQ+owwXoeAgL4POr7sjnQQFzQQT0XcK6TJPNeY2X8VkhvjsLYLFQiEABq59nwjkphE/Gqy2YWwJ5WigIvz+hnxNlZnhZSJMCXkn99wI9Jhg72/YXrQ5fxwyTxr2CD7FcL1iIzwTRQC5I/xJ+syInmMAXfaPggPUwcn0LH/bltKsRBe4DFeQSTgX2Lfx1fpznQX/Uti6oUOUzRg/YvDbmyAQT2fOJhtNJ5z60vtkPfExPsH6kdJyga0FOepEa2RYfjlajQ5EGxEoAveQTgqCQRPuGQBICBKrBnfyRIu7ExlvrKoF5QyDeNjYhXvTCWJ8IRCV4h0y0i9UuE6CCkYmEUgOCd32/dJGXeac5wugJyLfx9NgVm0cC8bk5zvGh5Dd19CIAtfi3BItR2cm0Q3BPIF/Ln3TIxe516/U7gnQfaE+j96XpawL8wgM/ErwLI/iVYIo0+f6/EDRd1//LRJUORsw/Etzul6zB8mMeNDs+zLh+JngaAL8RzC7ec3N9r8EEDWYEIhS7L4aqjuwJ2BMFaXbLLwZ705ravbTHTyb8YojHOspfDQoBjd+z5Gcf8YPirPNeG1tXa5m0+gVrTafl9QDKCADmt5na0i5NeDo/e2n4rpSFvycgzwukXQS3mx5ruY1sQ01EbJ5fGfqnuxl+EbFtZJGrMe+Ji/KIw93PF02VgulvGFr78DYzF7z5qjVFSTVo5kxs1t8tmmk1rdoPY1PcXIB7Q5b2NcWHmh3Pf0VAoGfmB5rC1PxfENSnh85Iw92MPyDQ55/J/lTx28dkOrPNVfLCRx7lhwSCRPsgh4od+O7PTgKDl506kLWk29eE6XHmzRZYHtu6R8rR5+yq/mnkjZvbAsP+bIa8fgDzeo0iuIevWyF/rsxeyL/L0SII4eRPeKrP6xM0f3841/0DvJhdiT4lNpEAAAAASUVORK5CYII=";
