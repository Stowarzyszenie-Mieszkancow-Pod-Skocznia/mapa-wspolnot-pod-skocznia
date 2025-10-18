import { MAP_CONFIG } from '../config/mapConfig.js';

export class URLSync {
  constructor(map, layers, overlays) {
    this.map = map
    this.layers = layers
    this.overlays = overlays
    this.params = new URLSearchParams(location.search)
    this.activeOverlayKeys = new Set()
    this.urlTimer = null
  }

  getInitialState() {
    return {
      zoom: this.params.get('zoom') || MAP_CONFIG.DEFAULT_ZOOM,
      center: [
        this.params.get('lat') || MAP_CONFIG.DEFAULT_CENTER[0],
        this.params.get('lng') || MAP_CONFIG.DEFAULT_CENTER[1]
      ],
      baseLayer: this.params.get('baseLayer') || MAP_CONFIG.DEFAULT_BASE_LAYER,
      overlays: (this.params.get('overlays') || MAP_CONFIG.DEFAULT_OVERLAYS)
        .split(',')
        .map(s => s.trim())
        .filter(k => k && this.overlays[k])
    };
  }

  updateUrl() {
    clearTimeout(this.urlTimer)
    this.urlTimer = setTimeout(() => {
      const mapCenter = this.map.getCenter()
      const currentBaseKey = Object.entries(this.layers)
        .find(([, layer]) => this.map.hasLayer(layer))?.[0]

      this.params.set('zoom', this.map.getZoom())
      this.params.set('lat', mapCenter.lat)
      this.params.set('lng', mapCenter.lng)
      this.params.set('baseLayer', currentBaseKey || '')
      this.params.set('overlays', [...this.activeOverlayKeys].join(','))

      const newurl = `${window.location.origin}${window.location.pathname}?${this.params.toString()}`
      window.history.pushState({ path: newurl }, '', newurl)
    }, MAP_CONFIG.URL_UPDATE_DEBOUNCE)
  }

  setupListeners() {
    this.map.on('moveend zoomend', () => this.updateUrl())
    this.map.on('baselayerchange', () => this.updateUrl())

    this.map.on('overlayadd', (e) => {
      const key = this.getKeyByLayer(e.layer, this.overlays)
      if (key) this.activeOverlayKeys.add(key)
      this.updateUrl()
    });

    this.map.on('overlayremove', (e) => {
      const key = this.getKeyByLayer(e.layer, this.overlays)
      if (key) this.activeOverlayKeys.delete(key)
      this.updateUrl()
    });
  }

  getKeyByLayer(layer, dict) {
    return Object.entries(dict).find(([, lyr]) => lyr === layer)?.[0]
  }
}