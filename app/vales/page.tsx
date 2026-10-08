"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

type Producto = {
  explosivo: string;
  cantidad: string;
  unidad: string;
  lote: string;
};

const EXPLOSIVOS = [
  "AMEX",
  "AMEX UH",
  "AMEX LD",
  "AMEXAL 400",
  "EMULNOR 3000",
  "EMULSION GRANEL",
  "SENATEL ULTREX",
  "SOFTRON",
  "TRIMEX",
  "EXACORTE",
  "PENTEX CILINDRICO 150",
  "PENTEX CILINDRICO 225",
  "PENTEX CILINDRICO 450",
  "MINIBOOSTER 40G",
  "RIOCORD 3P",
  "GUIA COMPUESTA",
  "I-KON",
  "CABLE DE DISPARO",
  "CABLE DE CONEXION",
  "DET NO ELECTRICO",
];

function productoVacio(): Producto {
  return {
    explosivo: "",
    cantidad: "",
    unidad: "KG",
    lote: "",
  };
}

const hoy = new Date().toISOString().slice(0, 10);

export default function NuevoValePage() {
  const [form, setForm] = useState({
    numero_vale: "",
    fecha_vale: hoy,
    fecha_disparo: hoy,
    turno: "DIA",
    sector: "",
    labor: "",
    nivel: "",
    tipo: "DESARROLLO",
    tipo_diagrama: "",
    supervisor: "",
  });

  const [productos, setProductos] = useState<Producto[]>([
    productoVacio(),
  ]);

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  function actualizarCampo(
    campo: keyof typeof form,
    valor: string
  ) {
    setForm((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function actualizarProducto(
    index: number,
    campo: keyof Producto,
    valor: string
  ) {
    setProductos((anteriores) =>
      anteriores.map((producto, i) =>
        i === index
          ? {
              ...producto,
              [campo]: valor,
            }
          : producto
      )
    );
  }

  function agregarProducto() {
    setProductos((anteriores) => [
      ...anteriores,
      productoVacio(),
    ]);
  }

  function eliminarProducto(index: number) {
    setProductos((anteriores) => {
      if (anteriores.length === 1) {
        return anteriores;
      }

      return anteriores.filter((_, i) => i !== index);
    });
  }

  function limpiarFormulario() {
    setForm({
      numero_vale: "",
      fecha_vale: hoy,
      fecha_disparo: hoy,
      turno: "DIA",
      sector: "",
      labor: "",
      nivel: "",
      tipo: "DESARROLLO",
      tipo_diagrama: "",
      supervisor: "",
    });

    setProductos([
      productoVacio(),
    ]);
  }

  async function guardarVale(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMensaje("");
    setError("");

    if (!form.numero_vale.trim()) {
      setError("Debes ingresar el número de vale.");
      return;
    }

    if (!form.fecha_vale) {
      setError("Debes indicar la fecha del vale.");
      return;
    }

    if (!form.turno) {
      setError("Debes seleccionar el turno.");
      return;
    }

    if (!form.labor.trim()) {
      setError("Debes indicar la labor.");
      return;
    }

    const detalle = productos.map((producto) => ({
      explosivo: producto.explosivo.trim(),
      cantidad: Number(producto.cantidad),
      unidad: producto.unidad.trim(),
      lote: producto.lote.trim(),
    }));

    for (let i = 0; i < detalle.length; i++) {
      const producto = detalle[i];

      if (!producto.explosivo) {
        setError(
          `Debes seleccionar el explosivo del producto ${i + 1}.`
        );
        return;
      }

      if (
        !Number.isFinite(producto.cantidad) ||
        producto.cantidad <= 0
      ) {
        setError(
          `La cantidad del producto ${i + 1} debe ser mayor a cero.`
        );
        return;
      }

      if (!producto.unidad) {
        setError(
          `Debes seleccionar la unidad del producto ${i + 1}.`
        );
        return;
      }

      if (!producto.lote) {
        setError(
          `Debes ingresar el lote del producto ${i + 1}.`
        );
        return;
      }
    }

    try {
      setGuardando(true);

      const respuesta = await fetch("/api/vales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          ...form,
          numero_vale: form.numero_vale.trim(),
          sector: form.sector.trim(),
          labor: form.labor.trim(),
          nivel: form.nivel.trim(),
          tipo_diagrama: form.tipo_diagrama.trim(),
          supervisor: form.supervisor.trim(),
          detalle,
          usuario: "USUARIO_PRUEBA",
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.detalle
            ? `${resultado.error} ${resultado.detalle}`
            : resultado.error ??
              "No fue posible guardar el vale."
        );
      }

      setMensaje(
        `Vale ${form.numero_vale} guardado correctamente. ID local: ${resultado.vale_id}.`
      );

      limpiarFormulario();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No fue posible guardar el vale."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold">
              Nuevo vale de explosivos
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Registro operacional MineBlast Control
            </p>
          </div>

          <Link
            href="/vales/lista"
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-slate-700"
          >
            <ArrowLeft size={16} />
            Volver
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">

        <form
          onSubmit={guardarVale}
          className="space-y-6"
        >

          {/* DATOS GENERALES */}

          <section className="rounded-xl border border-slate-800 bg-slate-900">

            <div className="border-b border-slate-800 px-6 py-5">
              <h2 className="font-semibold">
                Información del vale
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Datos generales del registro.
              </p>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2 lg:grid-cols-3">

              <Campo label="Número de vale" requerido>
                <input
                  value={form.numero_vale}
                  onChange={(e) =>
                    actualizarCampo(
                      "numero_vale",
                      e.target.value
                    )
                  }
                  className="mine-input"
                  placeholder="Ej: 00125"
                  required
                />
              </Campo>

              <Campo label="Fecha vale" requerido>
                <input
                  type="date"
                  value={form.fecha_vale}
                  onChange={(e) =>
                    actualizarCampo(
                      "fecha_vale",
                      e.target.value
                    )
                  }
                  className="mine-input"
                  required
                />
              </Campo>

              <Campo label="Fecha disparo">
                <input
                  type="date"
                  value={form.fecha_disparo}
                  onChange={(e) =>
                    actualizarCampo(
                      "fecha_disparo",
                      e.target.value
                    )
                  }
                  className="mine-input"
                />
              </Campo>

              <Campo label="Turno" requerido>
                <select
                  value={form.turno}
                  onChange={(e) =>
                    actualizarCampo(
                      "turno",
                      e.target.value
                    )
                  }
                  className="mine-select"
                  required
                >
                  <option value="DIA">
                    Día
                  </option>

                  <option value="NOCHE">
                    Noche
                  </option>
                </select>
              </Campo>

              <Campo label="Sector">
                <input
                  value={form.sector}
                  onChange={(e) =>
                    actualizarCampo(
                      "sector",
                      e.target.value
                    )
                  }
                  className="mine-input"
                  placeholder="Ej: Tránsito"
                />
              </Campo>

              <Campo label="Labor" requerido>
                <input
                  value={form.labor}
                  onChange={(e) =>
                    actualizarCampo(
                      "labor",
                      e.target.value
                    )
                  }
                  className="mine-input"
                  placeholder="Ej: NP2 SUR"
                  required
                />
              </Campo>

              <Campo label="Nivel">
                <input
                  value={form.nivel}
                  onChange={(e) =>
                    actualizarCampo(
                      "nivel",
                      e.target.value
                    )
                  }
                  className="mine-input"
                  placeholder="Ej: 900"
                />
              </Campo>

              <Campo label="Tipo">
                <select
                  value={form.tipo}
                  onChange={(e) =>
                    actualizarCampo(
                      "tipo",
                      e.target.value
                    )
                  }
                  className="mine-select"
                >
                  <option value="DESARROLLO">
                    Desarrollo
                  </option>

                  <option value="PRODUCCION">
                    Producción
                  </option>

                  <option value="DESQUINCHE">
                    Desquinche
                  </option>

                  <option value="OTRO">
                    Otro
                  </option>
                </select>
              </Campo>

              <Campo label="Tipo de diagrama">
                <input
                  value={form.tipo_diagrama}
                  onChange={(e) =>
                    actualizarCampo(
                      "tipo_diagrama",
                      e.target.value
                    )
                  }
                  className="mine-input"
                  placeholder="Ej: 4x4"
                />
              </Campo>

              <Campo label="Supervisor">
                <input
                  value={form.supervisor}
                  onChange={(e) =>
                    actualizarCampo(
                      "supervisor",
                      e.target.value
                    )
                  }
                  className="mine-input"
                  placeholder="Nombre del supervisor"
                />
              </Campo>

            </div>
          </section>

          {/* PRODUCTOS */}

          <section className="rounded-xl border border-slate-800 bg-slate-900">

            <div className="flex flex-col gap-4 border-b border-slate-800 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h2 className="font-semibold">
                  Productos del vale
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Cada producto debe tener explosivo, cantidad,
                  unidad y lote.
                </p>
              </div>

              <button
                type="button"
                onClick={agregarProducto}
                className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20"
              >
                <Plus size={16} />
                Agregar producto
              </button>

            </div>

            <div className="space-y-4 p-6">

              {productos.map((producto, index) => (

                <div
                  key={index}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                >

                  <div className="mb-4 flex items-center justify-between">

                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Producto {index + 1}
                    </p>

                    {productos.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          eliminarProducto(index)
                        }
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                        Eliminar
                      </button>
                    )}

                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                    <Campo label="Explosivo" requerido>
                      <select
                        value={producto.explosivo}
                        onChange={(e) =>
                          actualizarProducto(
                            index,
                            "explosivo",
                            e.target.value
                          )
                        }
                        className="mine-select"
                        required
                      >
                        <option value="">
                          Seleccionar explosivo
                        </option>

                        {EXPLOSIVOS.map((explosivo) => (
                          <option
                            key={explosivo}
                            value={explosivo}
                          >
                            {explosivo}
                          </option>
                        ))}
                      </select>
                    </Campo>

                    <Campo label="Cantidad" requerido>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={producto.cantidad}
                        onChange={(e) =>
                          actualizarProducto(
                            index,
                            "cantidad",
                            e.target.value
                          )
                        }
                        className="mine-input"
                        placeholder="0"
                        required
                      />
                    </Campo>

                    <Campo label="Unidad" requerido>
                      <select
                        value={producto.unidad}
                        onChange={(e) =>
                          actualizarProducto(
                            index,
                            "unidad",
                            e.target.value
                          )
                        }
                        className="mine-select"
                        required
                      >
                        <option value="KG">
                          Kilogramos
                        </option>

                        <option value="UN">
                          Unidades
                        </option>

                        <option value="M">
                          Metros
                        </option>
                      </select>
                    </Campo>

                    <Campo label="Lote" requerido>
                      <input
                        value={producto.lote}
                        onChange={(e) =>
                          actualizarProducto(
                            index,
                            "lote",
                            e.target.value
                          )
                        }
                        className="mine-input"
                        placeholder="Ej: TEST-DW-001"
                        required
                      />
                    </Campo>

                  </div>

                </div>

              ))}

            </div>

          </section>

          {/* MENSAJES */}

          {mensaje && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-900 bg-emerald-950/20 p-4 text-sm text-emerald-300">
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0"
              />

              <div>
                <p className="font-semibold">
                  Vale guardado correctamente
                </p>

                <p className="mt-1">
                  {mensaje}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">
              <CircleAlert
                size={18}
                className="mt-0.5 shrink-0"
              />

              <div>
                <p className="font-semibold">
                  No se pudo guardar
                </p>

                <p className="mt-1">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* ACCIONES */}

          <div className="flex flex-col justify-end gap-3 sm:flex-row">

            <Link
              href="/vales/lista"
              className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-3 text-center text-sm font-medium text-slate-300 hover:bg-slate-700"
            >
              Ver vales registrados
            </Link>

            <button
              type="submit"
              disabled={guardando}
              className="flex min-w-52 items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={17} />

              {guardando
                ? "Guardando..."
                : "Guardar vale"}
            </button>

          </div>

        </form>
      </div>

      <style jsx global>{`

        .mine-input,
        .mine-select {
          width: 100%;
          min-height: 44px;
          border-radius: 0.5rem;
          border: 1px solid #334155;
          background: #0f172a !important;
          padding: 0.65rem 0.75rem;
          color: #e2e8f0 !important;
          font-size: 0.875rem;
          outline: none;
        }

        .mine-input:focus,
        .mine-select:focus {
          border-color: #f59e0b;
        }

        .mine-input::placeholder {
          color: #64748b;
        }

        .mine-select {
          background-color: #0f172a !important;
          color: #e2e8f0 !important;
          color-scheme: dark;
        }

        .mine-select option {
          background-color: #0f172a !important;
          color: #e2e8f0 !important;
        }

        .mine-select option:checked {
          background-color: #334155 !important;
          color: #ffffff !important;
        }

        input[type="date"] {
          color-scheme: dark;
        }

      `}</style>

    </main>
  );
}

function Campo({
  label,
  requerido,
  children,
}: {
  label: string;
  requerido?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-slate-400">
        {label}

        {requerido && (
          <span className="ml-1 text-amber-400">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}