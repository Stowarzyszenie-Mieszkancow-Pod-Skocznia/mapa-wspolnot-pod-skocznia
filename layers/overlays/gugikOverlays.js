import { createWMSOverlays} from "./factories/WMSOverlayFactory.js"
import {MAP_CONFIG} from "../../config/mapConfig.js"

const GUGIK_ATTRIBUTION = '&copy; <a href="https://www.gov.pl/web/gugik">Główny Urząd Geodezji i Kartografii</a>'
const KIEG_BASE_URL = 'https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow?'
const KIUT_BASE_URL = 'https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaUzbrojeniaTerenu?'

const UM_WARSZAWA_ATTRIBUTION = '&copy; <a href="https://architektura.um.warszawa.pl/udostepniane-dane">Urząd m.st. Warszawy</a>'
const UM_WARSZAWA_BASE_URL = 'https://wms.um.warszawa.pl/serwis?'

const GUGIK_OPTIONS = {
  format: 'image/png',
  transparent: true,
  maxZoom: MAP_CONFIG.MAX_ZOOM,
  attribution: GUGIK_ATTRIBUTION
}

const UM_WARSZAWA_OPTIONS = {
  format: 'image/png',
  transparent: true,
  maxZoom: MAP_CONFIG.MAX_ZOOM,
  attribution: UM_WARSZAWA_ATTRIBUTION
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
  'Numery działek': 'numery_dzialek',
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

const umWarszawaLayers = {
  'MPZP': [
    'MPZP_BUDYNKI_DO_ZACHOWANIA',
    'MPZP_BUDYNKI_WPISANE_DO_REJESTRU_ZABYTKOW',
    'MPZP_CIAGI_PIESZE',
    'MPZP_DOMINANTY_PRZESTRZENNE',
    'MPZP_DOMINANTY_WYSOKOSCIOWE',
    'MPZP_GRANICE_OBSZAROW_OBJETYCH_OCHRONA_KONSERWATORSKA',
    'MPZP_GRANICE_OBSZAROW_OBJETYCH_OCHRONA_SRODOWISKA',
    'MPZP_METRO',
    'MPZP_NAPOWIETRZNE_LINIE_EE',
    'MPZP_NIEPRZEKRACZALNE_GRANICE_POCHOWKOW',
    'MPZP_NIEPRZEKRACZALNE_LINIE_ZABUDOWY',
    'MPZP_NIEPRZEKRACZALNE_LINIE_ZABUDOWY_PODZIEMII',
    'MPZP_NIEPRZEKRACZALNE_LINIE_ZABUDOWY_PRZEWIESZEN',
    'MPZP_NIEPRZEKRACZALNE_LINIE_ZABUDOWY_ZWYZKI',
    'MPZP_OBIEKTY_WPISANE_DO_REJESTRU_ZABYTKOW',
    'MPZP_OBOWIAZUJACE_LINIE_ZABUDOWY',
    'MPZP_OSIE_KOMPOZYCYJNE',
    'MPZP_OSIE_WIDOKOWE',
    'MPZP_PARKINGI_NA_POZIOMIE_TERENU',
    'MPZP_PARKINGI_ZATOKOWE',
    'MPZP_PLACE_MIEJSKIE',
    'MPZP_POMNIKI',
    'MPZP_POMNIKI_PRZYRODY',
    'MPZP_POMNIKI_PRZYRODY_NIEOZYWIONEJ',
    'MPZP_PRZEZNACZENIE_TERENU',
    'MPZP_SCEZKI_ROWEROWE',
    'MPZP_SREFY_OGRANICZEN',
    'MPZP_STREFY_ARCHEOLOGICZNE',
    'MPZP_TERENY_O_ROZNYCH_ZASADACH_GOSPODAROWANIA',
    'MPZP_TERENY_ZAMKNIETE',
    'MPZP_ZAKRESY_OBOWIAZUJACE',
    'MPZP_ZAKRESY_SPORZADZANE'
  ].join(',')
}

const kiegLayersConfig = createLayerConfig(kiegLayers, GUGIK_OPTIONS)
const kiutLayersConfig = createLayerConfig(kiutLayers, GUGIK_OPTIONS)
const umWarszawaLayersConfig = createLayerConfig(umWarszawaLayers, UM_WARSZAWA_OPTIONS)

const kiegOverlays = createWMSOverlays(
  KIEG_BASE_URL,
  kiegLayersConfig
)

const kiutOverlays = createWMSOverlays(
  KIUT_BASE_URL,
  kiutLayersConfig
)

const umWarszawaOverlays = createWMSOverlays(
  UM_WARSZAWA_BASE_URL,
  umWarszawaLayersConfig
)

export {
  kiegOverlays,
  kiutOverlays,
  umWarszawaOverlays,
}