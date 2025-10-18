import { createWMSOverlays} from "./factories/WMSOverlayFactory.js"
import {MAP_CONFIG} from "../../config/mapConfig.js"

const GUGIK_ATTRIBUTION = '&copy; <a href="https://www.gov.pl/web/gugik">Główny Urząd Geodezji i Kartografii</a>'
const KIEG_BASE_URL = 'https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow?'
const KIMP_BASE_URL = 'https://mapy.geoportal.gov.pl/wss/ext/KrajowaIntegracjaMiejscowychPlanowZagospodarowaniaPrzestrzennego?'
const KIUT_BASE_URL = 'https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaUzbrojeniaTerenu?'
const GUGIK_OPTIONS = {
  format: 'image/png',
  transparent: true,
  maxZoom: MAP_CONFIG.MAX_ZOOM,
  attribution: GUGIK_ATTRIBUTION
}

const createLayerConfig = (layers, options) => {
  return Object.entries(layers).reduce((acc, [key, value]) => {
    acc[key] = {
      layerName: value,
      options: options
    }
    return acc
  }, {})
}

const kiegLayers = {
  'Budynki': 'budynki',
  'Działki': 'dzialki',
  'Numery działek': 'numeryDzialek',
}

const kimpLayers = {
  'Strefy MPZP': 'wektor-str,wektor-lzb',
}

const kiutLayers = {
  'Sieć ciepłownicza': 'przewod_cieplowniczy',
  'Sieć elektroenergetyczna': 'przewod_elektroenergetyczny',
  'Sieć gazowa': 'przewod_gazowy',
  'Sieć kanalizacyjna': 'przewod_kanalizacyjny',
  'Sieć specjalna': 'przewod_specjalny',
  'Sieć telekomunikacyjna': 'przewod_telekomunikacyjny',
  'Sieć wodociągowa': 'przewod_wodociagowy',
  'Sieć niezidentyfikowana': 'przewod_niezidentyfikowany',
}

const kiegLayersConfig = createLayerConfig(kiegLayers, GUGIK_OPTIONS)
const kimpLayersConfig = createLayerConfig(kimpLayers, GUGIK_OPTIONS)
const kiutLayersConfig = createLayerConfig(kiutLayers, GUGIK_OPTIONS)

const kiegOverlays = createWMSOverlays(
  KIEG_BASE_URL,
  kiegLayersConfig
)

const kimpOverlays = createWMSOverlays(
  KIMP_BASE_URL,
  kimpLayersConfig
)

const kiutOverlays = createWMSOverlays(
  KIUT_BASE_URL,
  kiutLayersConfig
)

export {
  kiegOverlays,
  kimpOverlays,
  kiutOverlays,
}