const wspolnotyData = [
  {
    name: "Green Mokotów",
    administrator: "LemmonHouse",
    administratorEmail: "biuro@lemmonhouse.pl",
    przedstawicielWStowarzyszeniu: "Michał Jarosz",
    budynki: "Bergamotki 2, Bergamotki 4, Sikorskiego 3, Sikorskiego 3A, Lubaszki 8, Lubaszki 10",
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
    administratorEmail: "pawelrokicki@polbest.waw.pl",
    budynki: "Bergamotki 1",
    www: "https://zarzadzanie-nieruchomosciami.eu/strefa-klienta/63-mokotow/321-wspolnota-green-mokotow-2-warszawa",
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
  }
]

const wspolnoty = wspolnotyGeoJSON.map(data => {
  const geoJSON = data.geoJSON
  geoJSON.features.forEach(feature => {
    feature.properties = wspolnotyData.find(({name}) => name === data.name)
  })
  return geoJSON
})

export {
  wspolnoty
}