import { copyText } from '../utils/clipboard.js';

export function setupContextMenu(map) {
  map.on('contextmenu', async (e) => {
    if (e.originalEvent) e.originalEvent.preventDefault()

    const { lat, lng } = e.latlng;
    const text = JSON.stringify([lng, lat])
    const ok = await copyText(text)

    L.popup({
      autoClose: true,
      closeButton: false,
      offset: [0, -8],
      className: ok ? 'copy-ok' : 'copy-fail',
    })
      .setLatLng(e.latlng)
      .setContent(ok ? `Copied: ${text}` : 'Copy failed')
      .openOn(map)
  });
}
