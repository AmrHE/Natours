/* eslint-disable */
export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoiYW1yaGUiLCJhIjoiY2t3MjBjNTVpMXFrNDJ1cWl0YXpyNWR3aCJ9.Wqal4LFw6mpV---wg-aHCw';

  const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/amrhe/ckw212ip0581314pakopp9wkt', // style URL
    scrollZoom: false,
    // center: [-118, 34], // starting position [lng, lat]
    // zoom: 10, // starting zoom
    // interactive: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((location) => {
    //Craete Map Marker
    const el = document.createElement('div');
    el.className = 'marker';

    //Add Marker to the map
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(location.coordinates)
      .addTo(map);

    //Add info popup
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(location.coordinates)
      .setHTML(`<p>Day ${location.day}: ${location.description}</p>`)
      .addTo(map);

    //Extends the map bounds to include the current location
    bounds.extend(location.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
