const wspolnotyData = [
  {
    name: "Green Mokotów",
    administrator: "LemmonHouse",
    budynki: "Bergamotki 2, Bergamotki 4, Sikorskiego 3, Sikorskiego 3A, Lubaszki 8, Lubaszki 10",
    przedstawicielWStowarzyszeniu: true,
    zarzad: "powierzony"
  },
  {
    name: "Green Mokotów 1",
    www: "https://zarzadzanie-nieruchomosciami.eu/strefa-klienta/123-wspolnota-green-mokotow-1-warszawa",
    administrator: "PolBest",
    budynki: "Bergamotki 3, Faworytki 2",
  },
  {
    name: "Green Mokotów 2",
    administrator: "PolBest",
    budynki: "Bergamotki 1",
    www: "https://zarzadzanie-nieruchomosciami.eu/strefa-klienta/63-mokotow/321-wspolnota-green-mokotow-2-warszawa",
  },
  {
    name: "Nordic Mokotów I",
    przedstawicielWStowarzyszeniu: true,
    budynki: "Sikorskiego 9C",
  },
  {
    name: "Nordic Mokotów II",
    przedstawicielWStowarzyszeniu: true,
    budynki: "Sikorskiego 9D",
  },
  {
    name: "Nordic Mokotów III",
    przedstawicielWStowarzyszeniu: true,
    budynki: "Pory 53",
  },
  {
    name: "Wille Bergamotki",
    administrator: "Royal House",
    budynki: "Eukaliptusowa 1, Eukaliptusowa 3, Eukaliptusowa 5",
    przedstawicielWStowarzyszeniu: true,
    zarzad: "właścicielski"
  }
]

const wspolnotyGeoJSON = [
  {
    "name": "Green Mokotów",
    "geoJSON": {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "properties": {

          },
          "geometry": {
            "coordinates": [
              [
                [
                  21.041100105343247,
                  52.17803018627916
                ],
                [
                  21.04162373677036,
                  52.177579083238584
                ],
                [
                  21.042497307248425,
                  52.17753679209386
                ],
                [
                  21.04259947923481,
                  52.17835441376391
                ],
                [
                  21.04183063504209,
                  52.17837320948766
                ],
                [
                  21.041100105343247,
                  52.17803018627916
                ]
              ]
            ],
            "type": "Polygon"
          }
        },
        {
          "type": "Feature",
          "properties": {
            "name": "Green Mokotów"
          },
          "geometry": {
            "coordinates": [
              [
                [
                  21.042594370635697,
                  52.177539924772816
                ],
                [
                  21.043733711346164,
                  52.177486058770484
                ],
                [
                  21.043927834750548,
                  52.17921254888918
                ],
                [
                  21.042975082803395,
                  52.179807734012456
                ],
                [
                  21.042285421899464,
                  52.179505444908756
                ],
                [
                  21.042780956029873,
                  52.17909664653226
                ],
                [
                  21.042594370635697,
                  52.177539924772816
                ]
              ]
            ],
            "type": "Polygon"
          }
        }
      ]
    }
  },
  {
    "name": "Green Mokotów 1",
    "geoJSON": {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "properties": {
          },
          "geometry": {
            "coordinates": [
              [
                [
                  21.041540904188167,
                  52.17738779555327
                ],
                [
                  21.04106325015519,
                  52.17648713824309
                ],
                [
                  21.04214627320414,
                  52.17622555261528
                ],
                [
                  21.04242724616452,
                  52.177016570314834
                ],
                [
                  21.042475777858755,
                  52.177350203265036
                ],
                [
                  21.041540904188167,
                  52.17738779555327
                ]
              ]
            ],
            "type": "Polygon"
          }
        }
      ]
    }
  },
  {
    "name": "Green Mokotów 2",
    "geoJSON": {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "properties": {
          },
          "geometry": {
            "coordinates": [
              [
                [
                  21.042599509086017,
                  52.17733418685751
                ],
                [
                  21.042552507576005,
                  52.17698523074853
                ],
                [
                  21.043605004760536,
                  52.17676906186665
                ],
                [
                  21.043668792509607,
                  52.17728271857487
                ],
                [
                  21.042599509086017,
                  52.17733418685751
                ]
              ]
            ],
            "type": "Polygon"
          }
        }
      ]
    }
  },
  {
    "name": "Nordic Mokotów I",
    "geoJSON":{
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "properties": {},
          "geometry": {
            "coordinates": [
              [
                [
                  21.043606102466587,
                  52.181612753978094
                ],
                [
                  21.043930649757385,
                  52.18165222495774
                ],
                [
                  21.043868958950046,
                  52.18188082702576
                ],
                [
                  21.04398161172867,
                  52.182120940162775
                ],
                [
                  21.043903827667236,
                  52.182400522318865
                ],
                [
                  21.043418347835544,
                  52.18235447361406
                ],
                [
                  21.043606102466587,
                  52.181612753978094
                ]
              ]
            ],
            "type": "Polygon"
          }
        }
      ]
    },
  },
  {
    "name": "Nordic Mokotów II",
    "geoJSON": {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "properties": {},
          "geometry": {
            "coordinates": [
              [
                [
                  21.043418347835544,
                  52.18235447361406
                ],
                [
                  21.043944060802463,
                  52.182403811510255
                ],
                [
                  21.043925285339355,
                  52.182476173658976
                ],
                [
                  21.043952107429508,
                  52.1824778182519
                ],
                [
                  21.043895781040195,
                  52.18270477149162
                ],
                [
                  21.04391723871231,
                  52.182706416076094
                ],
                [
                  21.04390650987625,
                  52.18276068732938
                ],
                [
                  21.044021844863895,
                  52.18277384398686
                ],
                [
                  21.044011116027832,
                  52.18282811515786
                ],
                [
                  21.04331105947495,
                  52.18276562107638
                ],
                [
                  21.043418347835544,
                  52.18235447361406
                ]
              ]
            ],
            "type": "Polygon"
          }
        }
      ]
    }
  },
  {
    "name": "Nordic Mokotów III",
    "geoJSON": {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "properties": {},
          "geometry": {
            "coordinates": [
              [
                [
                  21.04325741529465,
                  52.18278700064045
                ],
                [
                  21.044539511203766,
                  52.18290541034766
                ],
                [
                  21.044488549232486,
                  52.18310440372879
                ],
                [
                  21.044464409351352,
                  52.183101114589235
                ],
                [
                  21.04444295167923,
                  52.18320143323633
                ],
                [
                  21.04434370994568,
                  52.18319485497131
                ],
                [
                  21.043227910995487,
                  52.183084668887794
                ],
                [
                  21.04324668645859,
                  52.18298928369952
                ],
                [
                  21.04320913553238,
                  52.18298763912551
                ],
                [
                  21.04325741529465,
                  52.18278700064045
                ]
              ]
            ],
            "type": "Polygon"
          }
        }
      ]
    }
  },
  {
    "name": "Wille Bergamotki",
    "geoJSON": {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "properties": {},
          "geometry": {
            "coordinates": [
              [
                [
                  21.03981283583917,
                  52.17858485903565
                ],
                [
                  21.0411680026439,
                  52.179234306080076
                ],
                [
                  21.04086778109189,
                  52.17943246223558
                ],
                [
                  21.03938543718212,
                  52.17873443727527
                ],
                [
                  21.03981283583917,
                  52.17858485903565
                ]
              ]
            ],
            "type": "Polygon"
          }
        }
      ]
    }
  }
]

const wspolnotyOverlayData = wspolnotyGeoJSON.map(data => {
  const geoJSON = data.geoJSON
  geoJSON.features.forEach(feature => {
    feature.properties = wspolnotyData.find(({name}) => name === data.name)
  })
  return geoJSON
})

const wspolnotyOverlay = L.geoJSON(undefined, {
  onEachFeature: (feature, layer) => {
    const props = feature.properties || {};
    const rows = Object.entries(props).map(
      ([k, v]) => `<tr><th style="text-align:left;padding-right:8px;">${k}</th><td>${v}</td></tr>`
    ).join("");

    const html = rows
      ? `<table>${rows}</table>`
      : "No properties";

    layer.bindPopup(html);
  },
  style: feature => {
    const style = {
      weight: 2,
      color: feature.properties.przedstawicielWStowarzyszeniu ? '#33ff88' : '#3388ff',
      fillColor: feature.properties.przedstawicielWStowarzyszeniu ? '#33ff88' : '#3388ff',
    }

    return style
  }
})

wspolnotyOverlayData.forEach(wspolnota => {
  wspolnotyOverlay.addData(wspolnota);
})

export {
  wspolnotyOverlay
}