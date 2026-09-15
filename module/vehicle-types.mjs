export const VEHICLE_TYPE_ICONS = Object.freeze({
  "Air Vehicle": "vehicle-plane",
  "Civilian Vehicle": "vehicle-car",
  "Heavy Vehicle": "vehicle-truck",
  "Lightweight Vehicle": "vehicle-bicycle",
  "Military Vehicle": "vehicle-apc",
  "Sea Vehicles": "vehicle-boat",
  Tank: "vehicle-tank",
  Trailers: "vehicle-wagon"
});

export const VEHICLE_TYPES = Object.keys(VEHICLE_TYPE_ICONS);
export const normalizeVehicleType = type => type === "Sea Vehicle" ? "Sea Vehicles" : String(type ?? "");

export function vehicleTypeIcon(type) {
  return `systems/ashdom/assets/icons/items/${VEHICLE_TYPE_ICONS[normalizeVehicleType(type)] ?? "vehicle"}.svg`;
}
