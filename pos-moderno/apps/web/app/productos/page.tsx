'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';

interface Prod {
  idProducto: number;
  descripcion: string;
  codigo: string;
  impuesto: string;
  precioCompra: number;
  precioVenta: number;
  precioMayoreo: number;
  seVendeA: string;
  usaInventarios: string;
  stock: string;
  stockMinimo: number;
  fechaVencimiento: string;
  idGrupo: number | null;
}

function mapProd(f: Record<string, unknown>): Prod {
  return {
    idProducto: Number(f.idProducto),
    descripcion: String(f.descripcion ?? ''),
    codigo: String(f.codigo ?? ''),
    impuesto: String(f.impuesto ?? '0'),
    precioCompra: f.precioDeCompra != null ? Number(f.precioDeCompra) : 0,
    precioVenta: f.precioDeVenta != null ? Number(f.precioDeVenta) : 0,
    precioMayoreo: f.precioMayoreo != null ? Number(f.precioMayoreo) : 0,
    seVendeA: String(f.seVendeA ?? 'UNIDAD'),
    usaInventarios: String(f.usaInventarios ?? 'NO'),
    stock: String(f.stock ?? '0'),
    stockMinimo: f.stockMinimo != null ? Number(f.stockMinimo) : 0,
    fechaVencimiento: String(f.fechaVencimiento ?? ''),
    idGrupo: f.idGrupo != null ? Number(f.idGrupo) : null,
  };
}

const VACIO = {
  id: null as number | null,
  descripcion: '',
  seVendeA: 'UNIDAD',
  costo: '0',
  ganancia: '0',
  precioVenta: '0',
  precioMayoreo: '0',
  aPartirDe: '0',
  idGrupo: '' as number | '',
  codigo: '',
  controlar: true,
  stock: '0',
  stockMinimo: '0',
  fechaVencimiento: '',
  noAplicaVenc: false,
};

export default function ProductosPage(): JSX.Element {
  const [productos, setProductos] = useState<Prod[]>([]);
  const [grupos, setGrupos] = useState<Array<{ idLine: number; linea: string }>>([]);
  const [vista, setVista] = useState<'lista' | 'form'>('lista');
  const [f, setF] = useState({ ...VACIO });
  const [busqueda, setBusqueda] = useState('');
  const [nuevoGrupo, setNuevoGrupo] = useState('');
  const [verNuevoGrupo, setVerNuevoGrupo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function importar(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const r = await api.importarProductos(file);
      setMsg(`Importación: ${r.creados} creados, ${r.omitidos} omitidos` + (r.errores.length ? `, ${r.errores.length} con error` : ''));
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function cargar(): void {
    api.productos().then((r) => setProductos(r.map(mapProd))).catch((e: Error) => setError(e.message));
    api.grupos().then(setGrupos).catch(() => undefined);
  }
  useEffect(cargar, []);

  const grupoNombre = (id: number | null): string =>
    grupos.find((g) => g.idLine === id)?.linea ?? '';

  function setCosto(v: string): void {
    const costo = Number(v) || 0;
    const gan = Number(f.ganancia) || 0;
    setF((p) => ({ ...p, costo: v, precioVenta: (costo * (1 + gan / 100)).toFixed(2) }));
  }
  function setGanancia(v: string): void {
    const costo = Number(f.costo) || 0;
    const gan = Number(v) || 0;
    setF((p) => ({ ...p, ganancia: v, precioVenta: (costo * (1 + gan / 100)).toFixed(2) }));
  }
  function setPrecioVenta(v: string): void {
    const costo = Number(f.costo) || 0;
    const pv = Number(v) || 0;
    setF((p) => ({ ...p, precioVenta: v, ganancia: costo > 0 ? ((pv / costo - 1) * 100).toFixed(2) : '0' }));
  }
  function generarCodigo(): void {
    setF((p) => ({ ...p, codigo: String(Math.floor(10000000 + Math.random() * 89999999)) }));
  }
  function abrirNuevo(): void {
    setF({ ...VACIO });
    setMsg(null);
    setError(null);
    setVista('form');
  }
  function abrirEditar(p: Prod): void {
    const costo = p.precioCompra;
    setF({
      id: p.idProducto,
      descripcion: p.descripcion,
      seVendeA: p.seVendeA,
      costo: String(costo),
      ganancia: costo > 0 ? ((p.precioVenta / costo - 1) * 100).toFixed(2) : '0',
      precioVenta: String(p.precioVenta),
      precioMayoreo: String(p.precioMayoreo),
      aPartirDe: '0',
      idGrupo: p.idGrupo ?? '',
      codigo: p.codigo,
      controlar: p.usaInventarios === 'SI',
      stock: p.stock,
      stockMinimo: String(p.stockMinimo),
      fechaVencimiento: p.fechaVencimiento,
      noAplicaVenc: false,
    });
    setVista('form');
  }

  async function agregarGrupo(): Promise<void> {
    if (!nuevoGrupo.trim()) return;
    try {
      await api.crearGrupo(nuevoGrupo.trim());
      setNuevoGrupo('');
      setVerNuevoGrupo(false);
      api.grupos().then(setGrupos);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function guardar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    const dto: Record<string, unknown> = {
      descripcion: f.descripcion,
      codigo: f.codigo || undefined,
      idGrupo: f.idGrupo || undefined,
      seVendeA: f.seVendeA,
      precioCompra: Number(f.costo) || 0,
      precioVenta: Number(f.precioVenta) || 0,
      precioMayoreo: Number(f.precioMayoreo) || 0,
      aPartirDe: Number(f.aPartirDe) || 0,
      usaInventarios: f.controlar ? 'SI' : 'NO',
      stock: f.controlar ? f.stock : '0',
      stockMinimo: f.controlar ? Number(f.stockMinimo) || 0 : 0,
      impuesto: '0',
      fechaVencimiento: f.controlar && !f.noAplicaVenc ? f.fechaVencimiento : undefined,
    };
    try {
      if (f.id) await api.actualizarProducto(f.id, dto);
      else await api.crearProducto(dto);
      setMsg(`Producto "${f.descripcion}" guardado.`);
      cargar();
      setVista('lista');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function borrar(id: number): Promise<void> {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await api.eliminarProducto(id);
      cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const lista = useMemo(() => {
    const q = busqueda.toLowerCase();
    return productos.filter((p) => !q || p.descripcion.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q));
  }, [productos, busqueda]);

  const costoInventario = productos.reduce((a, p) => a + p.precioCompra * (Number(p.stock) || 0), 0);

  // ---------- LISTA ----------
  if (vista === 'lista') {
    return (
      <div>
        <h2>Productos</h2>
        <div className="toolbar">
          <input placeholder="Buscar…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <input ref={fileRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={importar} />
          <button className="btn btn--ghost" onClick={() => fileRef.current?.click()}>▦ Importar desde EXCEL</button>
          <button className="btn btn--ghost" onClick={() => api.descargarPlantillaProductos()}>⬇ Plantilla</button>
          <button className="btn" style={{ marginLeft: 'auto', borderRadius: 999 }} onClick={abrirNuevo}>+ Agregar</button>
        </div>
        {error && <p className="alert alert--error">{error}</p>}
        {msg && <p className="alert alert--ok">{msg}</p>}
        <table>
          <thead>
            <tr>
              <th />
              <th>Código</th><th>Grupo</th><th>Descripción</th>
              <th className="num">Impuesto</th><th className="num">P_Compra</th><th className="num">P_mayoreo</th>
              <th className="num">Stock_mín</th><th>F_vencimiento</th><th className="num">Stock</th><th className="num">P_venta</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.idProducto}>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn--ghost" onClick={() => borrar(p.idProducto)}>✕</button>{' '}
                  <button className="btn btn--ghost" onClick={() => abrirEditar(p)}>✎</button>
                </td>
                <td>{p.codigo}</td>
                <td>{grupoNombre(p.idGrupo)}</td>
                <td>{p.descripcion}</td>
                <td className="num">{p.impuesto}</td>
                <td className="num">{p.precioCompra.toFixed(2)}</td>
                <td className="num">{p.precioMayoreo.toFixed(2)}</td>
                <td className="num">{p.stockMinimo.toFixed(2)}</td>
                <td>{p.fechaVencimiento}</td>
                <td className="num">{p.usaInventarios === 'SI' ? p.stock : '—'}</td>
                <td className="num">{p.precioVenta.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="cards" style={{ marginTop: 16 }}>
          <div className="card"><div className="card__value">{productos.length}</div><div className="card__label">Cant. de productos</div></div>
          <div className="card"><div className="card__value">{costoInventario.toFixed(2)}</div><div className="card__label">Costo de inventario</div></div>
        </div>
      </div>
    );
  }

  // ---------- FORM ----------
  return (
    <div>
      <div className="toolbar">
        <button className="btn btn--ghost" onClick={() => setVista('lista')}>← Volver al listado</button>
      </div>
      {error && <p className="alert alert--error">{error}</p>}
      <form className="panel" onSubmit={guardar} style={{ maxWidth: 680 }}>
        <div className="row"><label style={{ width: 130 }}>Descripción</label><input style={{ flex: 1 }} value={f.descripcion} onChange={(e) => setF((p) => ({ ...p, descripcion: e.target.value }))} required /></div>
        <div className="row" style={{ marginTop: 8 }}>
          <label style={{ width: 130 }} />
          <label><input type="radio" checked={f.seVendeA === 'UNIDAD'} onChange={() => setF((p) => ({ ...p, seVendeA: 'UNIDAD' }))} /> Por Unidad/Pieza</label>
          <label><input type="radio" checked={f.seVendeA === 'GRANEL'} onChange={() => setF((p) => ({ ...p, seVendeA: 'GRANEL' }))} /> A granel (decimales)</label>
        </div>
        <div className="row" style={{ marginTop: 8 }}><label style={{ width: 130 }}>Precio Costo</label><input type="number" step="0.01" value={f.costo} onChange={(e) => setCosto(e.target.value)} /></div>
        <div className="row" style={{ marginTop: 8 }}><label style={{ width: 130 }}>% Ganancia</label><input type="number" step="0.01" value={f.ganancia} onChange={(e) => setGanancia(e.target.value)} /></div>
        <div className="row" style={{ marginTop: 8 }}><label style={{ width: 130 }}>Precio venta</label><input type="number" step="0.01" value={f.precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} /></div>
        <div className="row" style={{ marginTop: 8 }}>
          <label style={{ width: 130 }}>Precio Mayoreo</label>
          <input type="number" step="0.01" value={f.precioMayoreo} onChange={(e) => setF((p) => ({ ...p, precioMayoreo: e.target.value }))} />
          <span>A partir de</span>
          <input style={{ width: 70 }} type="number" value={f.aPartirDe} onChange={(e) => setF((p) => ({ ...p, aPartirDe: e.target.value }))} /> uds.
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <label style={{ width: 130 }}>Grupo</label>
          <select value={f.idGrupo} onChange={(e) => setF((p) => ({ ...p, idGrupo: e.target.value ? Number(e.target.value) : '' }))}>
            <option value="">— sin grupo —</option>
            {grupos.map((g) => (<option key={g.idLine} value={g.idLine}>{g.linea}</option>))}
          </select>
          <button type="button" className="btn btn--ghost" onClick={() => setVerNuevoGrupo((v) => !v)}>+ Agregar Grupo</button>
        </div>
        {verNuevoGrupo && (
          <div className="row" style={{ marginTop: 8 }}>
            <label style={{ width: 130 }} />
            <input placeholder="Nombre del grupo" value={nuevoGrupo} onChange={(e) => setNuevoGrupo(e.target.value)} />
            <button type="button" className="btn" onClick={agregarGrupo}>Guardar grupo</button>
          </div>
        )}
        <div className="row" style={{ marginTop: 8 }}>
          <label style={{ width: 130 }}>Código de barras</label>
          <input value={f.codigo} onChange={(e) => setF((p) => ({ ...p, codigo: e.target.value }))} />
          <button type="button" className="btn btn--ghost" onClick={generarCodigo}>Generar código</button>
        </div>
        <div className="panel" style={{ background: '#f1f5f9', marginTop: 12 }}>
          <label style={{ fontWeight: 600 }}>
            <input type="checkbox" checked={f.controlar} onChange={(e) => setF((p) => ({ ...p, controlar: e.target.checked }))} /> Controlar inventarios
          </label>
          {f.controlar && (
            <>
              <div className="row" style={{ marginTop: 8 }}><label style={{ width: 90 }}>Hay</label><input type="number" step="0.01" value={f.stock} onChange={(e) => setF((p) => ({ ...p, stock: e.target.value }))} /> en este momento</div>
              <div className="row" style={{ marginTop: 8 }}><label style={{ width: 90 }}>Mínimo</label><input type="number" step="0.01" value={f.stockMinimo} onChange={(e) => setF((p) => ({ ...p, stockMinimo: e.target.value }))} /></div>
              <div className="row" style={{ marginTop: 8 }}>
                <label style={{ width: 90 }}>Vence</label>
                <input type="date" value={f.fechaVencimiento} disabled={f.noAplicaVenc} onChange={(e) => setF((p) => ({ ...p, fechaVencimiento: e.target.value }))} />
                <label><input type="checkbox" checked={f.noAplicaVenc} onChange={(e) => setF((p) => ({ ...p, noAplicaVenc: e.target.checked }))} /> No aplica</label>
              </div>
            </>
          )}
        </div>
        <button className="btn" type="submit" style={{ marginTop: 12 }}>{f.id ? 'Actualizar' : 'Guardar'}</button>
      </form>
    </div>
  );
}
