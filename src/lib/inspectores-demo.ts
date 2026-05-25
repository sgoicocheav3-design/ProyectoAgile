export interface InspeccionAgendada {
  idTramite: string;
  contribuyente: string;
  direccion: string;
  hora: string;
}

export interface InspectorDemo {
  id: string;
  nombre: string;
  inspeccionesAgendadas: InspeccionAgendada[];
}

export const INSPECTORES_DEMO: InspectorDemo[] = [
  {
    id: "INS-001",
    nombre: "Carlos Mendoza García",
    inspeccionesAgendadas: [
      {
        idTramite: "T-2025-001",
        contribuyente: "Bodega San Martín E.I.R.L.",
        direccion: "Av. España 345, Trujillo",
        hora: "09:00",
      },
      {
        idTramite: "T-2025-002",
        contribuyente: "Restaurante El Marino S.A.C.",
        direccion: "Jr. Independencia 120, Trujillo",
        hora: "11:00",
      },
    ],
  },
  {
    id: "INS-002",
    nombre: "María Fernández López",
    inspeccionesAgendadas: [
      {
        idTramite: "T-2025-003",
        contribuyente: "Farmacia Santa María E.I.R.L.",
        direccion: "Av. América Sur 560, Trujillo",
        hora: "08:30",
      },
      {
        idTramite: "T-2025-004",
        contribuyente: "Taller Mecánico El Rápido S.R.L.",
        direccion: "Carretera Industrial Km 2, Trujillo",
        hora: "10:00",
      },
      {
        idTramite: "T-2025-005",
        contribuyente: "Librería El Estudiante S.A.C.",
        direccion: "Jr. Pizarro 230, Trujillo",
        hora: "14:00",
      },
    ],
  },
  {
    id: "INS-003",
    nombre: "Roberto Torres Aguilar",
    inspeccionesAgendadas: [
      {
        idTramite: "T-2025-006",
        contribuyente: "Gimnasio FitLife S.A.C.",
        direccion: "Av. Larco 780, Trujillo",
        hora: "07:00",
      },
      {
        idTramite: "T-2025-007",
        contribuyente: "Cafetería El Buen Café E.I.R.L.",
        direccion: "Jr. Orbegoso 456, Trujillo",
        hora: "10:30",
      },
      {
        idTramite: "T-2025-008",
        contribuyente: "Veterinaria Mascotas Felices S.R.L.",
        direccion: "Av. Juan Pablo II 890, Trujillo",
        hora: "15:00",
      },
    ],
  },
];
