# World land geometry

`world-geodata.ts` contains real coastline geometry derived from Natural Earth's **1:110m Land** dataset (version 4.1.0), including major islands and polygon holes.

- Dataset: https://www.naturalearthdata.com/downloads/110m-physical-vectors/110m-land/
- Official download: https://naciscdn.org/naturalearth/110m/physical/ne_110m_land.zip
- Terms: https://www.naturalearthdata.com/about/terms-of-use/
- License: public domain; no proprietary globe texture or model is used.
- Conversion: shapefile polygon parts preserved; longitude/latitude rounded to four decimal places; original bounding boxes retained. Runtime point-in-polygon uses even/odd rings to preserve holes.
- Records: 127 polygons, 128 rings, 5143 coastline vertices.
- Download SHA-256: `1926c621afd6ac67c3f36639bb1236134a48d82226dc675d3e3df53d02d2a3de`

The display is a decorative globe rather than a political boundary map. Geometry is bundled locally and loaded only when the WebGL scene is enabled. No runtime request to a map provider is required.
