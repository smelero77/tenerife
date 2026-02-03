"use client";

import { HealthService } from "@/lib/queries/health";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, Globe } from "lucide-react";

interface HealthServiceCardProps {
  service: HealthService;
}

export function HealthServiceCard({ service }: HealthServiceCardProps) {
  // Generate OpenStreetMap iframe URL
  const getMapUrl = () => {
    if (!service.latitud || !service.longitud) return null;
    
    const lat = service.latitud;
    const lon = service.longitud;
    const zoom = 15;
    
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lon}`;
  };

  const mapUrl = getMapUrl();

  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-3">
          {/* Name */}
          <div>
            <h3 className="text-base font-semibold">{service.nombre}</h3>
          </div>

          {/* Address */}
          {service.direccion && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-sm">
                <p>{service.direccion}</p>
                {service.codigo_postal && (
                  <p className="text-muted-foreground">{service.codigo_postal} {service.municipio_nombre}</p>
                )}
              </div>
            </div>
          )}

          {/* Phone */}
          {service.telefono && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm">{service.telefono}</span>
            </div>
          )}

          {/* Email */}
          {service.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`mailto:${service.email}`} className="text-sm text-primary hover:underline">
                {service.email}
              </a>
            </div>
          )}

          {/* Web */}
          {service.web && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <a 
                href={service.web} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {service.web}
              </a>
            </div>
          )}

          {/* Map */}
          {mapUrl && (
            <div className="space-y-1.5">
              <iframe
                width="100%"
                height="200"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={mapUrl}
                className="rounded-lg border"
                title={`Mapa de ${service.nombre}`}
              />
              <div className="flex gap-2 justify-end">
                <a
                  href={`https://www.google.com/maps?q=${service.latitud},${service.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Google Maps
                </a>
                <span className="text-xs text-muted-foreground">|</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${service.latitud}&mlon=${service.longitud}&zoom=15`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  OpenStreetMap
                </a>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
