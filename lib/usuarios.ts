export type RolUsuario =
  | "JEFE_TURNO"
  | "POLVORIN"
  | "SUPERVISOR";


export type Permiso =
  | "VER_DASHBOARD"
  | "CREAR_VALE"
  | "VER_VALES"
  | "DESPACHAR_VALE"
  | "VER_INVENTARIO"
  | "REABASTECER"
  | "REGISTRAR_DEVOLUCION"
  | "REGISTRAR_CONCILIACION"
  | "GENERAR_AJUSTE"
  | "SINCRONIZAR"
  | "VER_REPORTES"
  | "EXPORTAR_REPORTES"
  | "VER_AUDITORIA";


export type UsuarioSistema = {
  id: string;
  nombre: string;
  usuario: string;
  password: string;
  rol: RolUsuario;
  cargo: string;
  activo: boolean;
};


export const usuarios: UsuarioSistema[] = [
  {
    id: "USR-001",
    nombre: "Jefe de Turno Demo",
    usuario: "jefeturno",
    password: "mineblast123",
    rol: "JEFE_TURNO",
    cargo: "Jefe de Turno",
    activo: true,
  },

  {
    id: "USR-002",
    nombre: "Encargado Polvorín Demo",
    usuario: "polvorin",
    password: "mineblast123",
    rol: "POLVORIN",
    cargo: "Encargado de Polvorín",
    activo: true,
  },

  {
    id: "USR-003",
    nombre: "Supervisor Demo",
    usuario: "supervisor",
    password: "mineblast123",
    rol: "SUPERVISOR",
    cargo: "Supervisor de Operaciones",
    activo: true,
  },
];


export const permisosPorRol: Record<
  RolUsuario,
  Permiso[]
> = {
  JEFE_TURNO: [
    "CREAR_VALE",
    "VER_VALES",
    "DESPACHAR_VALE",
    "VER_INVENTARIO",
    "SINCRONIZAR",
  ],

  POLVORIN: [
    "VER_VALES",
    "DESPACHAR_VALE",
    "VER_INVENTARIO",
    "REABASTECER",
    "REGISTRAR_DEVOLUCION",
    "REGISTRAR_CONCILIACION",
    "GENERAR_AJUSTE",
    "SINCRONIZAR",
  ],

  SUPERVISOR: [
    "VER_DASHBOARD",
    "VER_VALES",
    "VER_INVENTARIO",
    "REGISTRAR_CONCILIACION",
    "SINCRONIZAR",
    "VER_REPORTES",
    "EXPORTAR_REPORTES",
    "VER_AUDITORIA",
  ],
};


export function buscarUsuario(
  usuario: string,
  password: string
) {
  return usuarios.find(
    (item) =>
      item.usuario.toLowerCase() ===
        usuario.trim().toLowerCase() &&
      item.password === password &&
      item.activo
  );
}


export function obtenerPermisos(
  rol: RolUsuario
) {
  return permisosPorRol[rol] ?? [];
}