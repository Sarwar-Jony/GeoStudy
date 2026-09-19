import { writeArrayBuffer } from "geotiff";
import type { GridTransform } from "./mask";

export type TypedRaster = Float32Array | Uint8Array;

export interface GeoTiffOptions {
  transform: GridTransform;
  nodata?: number;
  dataType: "float32" | "byte";
}

/** Build a single-band, EPSG:4326 georeferenced GeoTIFF buffer from a flat raster. */
export async function buildGeoTiff(values: TypedRaster, opts: GeoTiffOptions): Promise<Buffer> {
  const { transform, nodata, dataType } = opts;
  const metadata: Record<string, unknown> = {
    height: transform.height,
    width: transform.width,
    ModelPixelScale: [transform.pixelSizeX, transform.pixelSizeY, 0],
    ModelTiepoint: [0, 0, 0, transform.originX, transform.originY, 0],
    GeographicTypeGeoKey: 4326,
    GTModelTypeGeoKey: 2,
    GTRasterTypeGeoKey: 1,
    GeogCitationGeoKey: "WGS 84",
    BitsPerSample: [dataType === "float32" ? 32 : 8],
    SampleFormat: [dataType === "float32" ? 3 : 1],
  };
  if (nodata !== undefined) {
    metadata.GDAL_NODATA = String(nodata);
  }
  const arrayBuffer = await writeArrayBuffer(values, metadata as never);
  return Buffer.from(arrayBuffer);
}
