'use client';

import 'leaflet/dist/leaflet.css';
import { Bus, MapPin, Train } from 'lucide-react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';

const FRANCE_CENTER: [number, number] = [46.603354, 1.888334];

const CITIES = [
    {
        id: 'rennes',
        name: 'Rennes',
        lat: 48.1173,
        lon: -1.6778,
        services: ['bus', 'metro'] as ('bus' | 'metro')[],
    },
];

export default function LiveMap() {
    return (
        <div className="flex h-full relative">
            {/* Side panel */}
            <div className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col z-10">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-5 h-5 text-custom-blue" />
                        <h2 className="font-bold text-gray-900 dark:text-white">Live Map</h2>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Connected transit networks</p>
                </div>

                {/* Connected cities */}
                <div className="p-4 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">Connected Cities</p>
                    <div className="space-y-3">
                        {CITIES.map(city => (
                            <div key={city.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                <p className="font-semibold text-sm text-gray-900 dark:text-white mb-2">{city.name}</p>
                                <div className="flex gap-2">
                                    {city.services.includes('bus') && (
                                        <span className="flex items-center gap-1 text-xs bg-red-50 dark:bg-red-900/20 text-custom-red border border-red-200 dark:border-red-800 rounded-full px-2 py-0.5">
                                            <Bus className="w-3 h-3" /> Bus
                                        </span>
                                    )}
                                    {city.services.includes('metro') && (
                                        <span className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-custom-blue border border-blue-200 dark:border-blue-800 rounded-full px-2 py-0.5">
                                            <Train className="w-3 h-3" /> Metro
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-400 dark:text-gray-500">{CITIES.length} city connected</p>
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 relative">
                <MapContainer
                    center={FRANCE_CENTER}
                    zoom={6}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {CITIES.map(city => (
                        <CircleMarker
                            key={city.id}
                            center={[city.lat, city.lon]}
                            radius={18}
                            pathOptions={{
                                color: '#017aeb',
                                fillColor: '#017aeb',
                                fillOpacity: 0.25,
                                weight: 2,
                            }}
                        >
                            <Popup>
                                <div className="text-sm min-w-[140px]">
                                    <p className="font-bold text-base mb-2">{city.name}</p>
                                    <div className="flex flex-col gap-1">
                                        {city.services.includes('bus') && (
                                            <span className="flex items-center gap-1.5 text-red-600">
                                                <Bus className="w-3.5 h-3.5" /> Bus network connected
                                            </span>
                                        )}
                                        {city.services.includes('metro') && (
                                            <span className="flex items-center gap-1.5 text-blue-600">
                                                <Train className="w-3.5 h-3.5" /> Metro network connected
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}
