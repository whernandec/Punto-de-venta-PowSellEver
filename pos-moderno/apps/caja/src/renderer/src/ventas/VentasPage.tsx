import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProductoDTO, RegistrarVentaDTO } from '@pos/types';
import { obtenerProductos } from '../api';

interface Props {
  idCaja: number;
  idUsuario: number;
}

interface LineaVenta {
  producto: ProductoDTO;
  cantidad: number;
  precioUnitario: number;
}

type Modo = 'lectora' | 'teclado';

export function VentasPage({ idCaja, idUsuario }: Props): JSX.Element {
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [carrito, setCarrito] = useState<LineaVenta[]>([]);
  const [modo, setModo] = useState<Modo>('lectora');
  const [busqueda, setBusqueda] = useState('');
  const [sel, setSel] = useState<number | null>(null);
  const [entrada, setEntrada] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState(0);
  const buscarRef = useRef<HTMLInputElement>(null);

  function cargarPendientes(): void {
    void window.posAPI.ventas
      .pendientes()
      .then((p) => setPendientes(p.filter((x) => x.estado !== 'sincronizada').length));
  }

  useEffect(() => {
    obtenerProductos()
      .then(setProductos)
      .catch((e: Error) => setError(e.message));
    cargarPendientes();
  }, []);

  // Mantén el foco en el buscador (clave para la lectora de código de barras).
  useEffect(() => {
    buscarRef.current?.focus();
  }, [modo]);

  const sugerencias = useMemo(() => {
    if (modo !== 'teclado' || !busqueda.trim()) return [];
    const q = busqueda.toLowerCase();
    return productos
      .filter(
        (p) =>
          (p.descripcion ?? '').toLowerCase().includes(q) ||
          (p.codigo ?? '').toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [modo, busqueda, productos]);

  const subTotal = carrito.reduce((a, l) => a + l.cantidad * l.precioUnitario, 0);
  const total = Math.max(0, subTotal - descuento);

  function agregar(p: ProductoDTO, cantidad = 1): void {
    setCarrito((prev) => {
      const i = prev.findIndex((l) => l.producto.id === p.id);
      if (i >= 0) {
        const copia = [...prev];
        copia[i] = { ...copia[i], cantidad: copia[i].cantidad + cantidad };
        return copia;
      }
      return [...prev, { producto: p, cantidad, precioUnitario: p.precioVenta ?? 0 }];
    });
    setMsg(null);
    setError(null);
  }

  function onBuscarKey(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key !== 'Enter') return;
    const q = busqueda.trim();
    if (!q) return;
    if (modo === 'lectora') {
      // La lectora "teclea" el código y manda Enter: match exacto por código.
      const p = productos.find((x) => (x.codigo ?? '') === q);
      if (p) agregar(p);
      else setError(`Código "${q}" no encontrado`);
    } else {
      // Teclado: agrega la primera coincidencia.
      if (sugerencias[0]) agregar(sugerencias[0]);
      else setError(`Sin coincidencias para "${q}"`);
    }
    setBusqueda('');
  }

  function cambiarCantidad(idx: number, delta: number): void {
    setCarrito((prev) =>
      prev
        .map((l, i) =>
          i === idx ? { ...l, cantidad: Math.max(0, l.cantidad + delta) } : l,
        )
        .filter((l) => l.cantidad > 0),
    );
  }

  function quitar(idx: number): void {
    setCarrito((prev) => prev.filter((_, i) => i !== idx));
    setSel(null);
  }

  // ---- Teclado numérico ----
  function tecla(d: string): void {
    setEntrada((e) => (d === ',' ? (e.includes('.') ? e : e + '.') : e + d));
  }
  function aplicar(campo: 'cantidad' | 'precio' | 'descuento'): void {
    const valor = Number(entrada);
    if (Number.isNaN(valor)) return;
    if (campo === 'descuento') {
      setDescuento(valor);
    } else if (sel != null) {
      setCarrito((prev) =>
        prev.map((l, i) =>
          i === sel
            ? campo === 'cantidad'
              ? { ...l, cantidad: valor }
              : { ...l, precioUnitario: valor }
            : l,
        ),
      );
    } else {
      setError('Selecciona una línea del carrito primero');
    }
    setEntrada('');
  }

  async function pesar(): Promise<void> {
    if (sel == null) {
      setError('Selecciona una línea para pesar');
      return;
    }
    try {
      const disponible = await window.posAPI.balanza.disponible();
      if (!disponible) {
        setError('Balanza no disponible');
        return;
      }
      const peso = await window.posAPI.balanza.leerPeso('COM1');
      setCarrito((prev) =>
        prev.map((l, i) => (i === sel ? { ...l, cantidad: peso } : l)),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function cobrar(): Promise<void> {
    if (carrito.length === 0) return;
    setError(null);
    const numeroDeDoc = `T-${Date.now()}`;
    const venta: RegistrarVentaDTO = {
      idCaja,
      idUsuario,
      tipoPago: 'Efectivo',
      numeroDeDoc,
      comprobante: 'TICKET',
      montoTotal: total,
      efectivo: total,
      pagoCon: total,
      vuelto: 0,
      lineas: carrito.map((l) => ({
        idProducto: l.producto.id,
        descripcion: l.producto.descripcion ?? '',
        codigo: l.producto.codigo ?? undefined,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
        costo: l.producto.precioCompra ?? 0,
        usaInventarios: l.producto.usaInventarios ?? 'NO',
      })),
    };
    try {
      const { idLocal } = await window.posAPI.ventas.registrar(venta);
      try {
        await window.posAPI.impresora.imprimirTicket('192.168.1.100', 9100, {
          empresa: 'Mi Negocio',
          lineas: carrito.map((l) => ({
            descripcion: l.producto.descripcion ?? '',
            cantidad: l.cantidad,
            precio: l.precioUnitario,
          })),
          total,
          pie: '¡Gracias por su compra!',
        });
      } catch {
        /* impresora opcional */
      }
      setMsg(`Venta ${numeroDeDoc} registrada (local #${idLocal}).`);
      setCarrito([]);
      setDescuento(0);
      setSel(null);
      cargarPendientes();
      buscarRef.current?.focus();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="pos">
      {/* Barra de búsqueda: Lectora vs Teclado */}
      <div className="pos__search">
        <input
          ref={buscarRef}
          className="pos__input"
          placeholder={
            modo === 'teclado'
              ? 'Buscar con TECLADO (nombre o código)'
              : 'Escanea con LECTORA de código de barras'
          }
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={onBuscarKey}
        />
        <div className="pos__toggle">
          <button
            className={modo === 'lectora' ? 'on' : ''}
            onClick={() => setModo('lectora')}
          >
            🔍 Lectora
          </button>
          <button
            className={modo === 'teclado' ? 'on' : ''}
            onClick={() => setModo('teclado')}
          >
            🔍 Teclado
          </button>
        </div>
      </div>

      {/* Sugerencias (modo teclado) */}
      {sugerencias.length > 0 && (
        <ul className="pos__sugerencias">
          {sugerencias.map((p) => (
            <li
              key={p.id}
              onClick={() => {
                agregar(p);
                setBusqueda('');
                buscarRef.current?.focus();
              }}
            >
              <span>{p.descripcion}</span>
              <span className="muted">
                {p.codigo} · {(p.precioVenta ?? 0).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="pos__body">
        {/* Carrito */}
        <section className="pos__cart">
          <table>
            <thead>
              <tr>
                <th></th>
                <th></th>
                <th></th>
                <th>Producto</th>
                <th className="num">Cant</th>
                <th className="num">P_Unit</th>
                <th className="num">Importe</th>
                <th className="num">Stock</th>
              </tr>
            </thead>
            <tbody>
              {carrito.map((l, i) => (
                <tr
                  key={l.producto.id}
                  className={sel === i ? 'sel' : ''}
                  onClick={() => setSel(i)}
                >
                  <td>
                    <button className="x" onClick={() => quitar(i)}>
                      ✕
                    </button>
                  </td>
                  <td>
                    <button onClick={() => cambiarCantidad(i, 1)}>+</button>
                  </td>
                  <td>
                    <button onClick={() => cambiarCantidad(i, -1)}>−</button>
                  </td>
                  <td>{l.producto.descripcion}</td>
                  <td className="num">{l.cantidad.toFixed(2)}</td>
                  <td className="num">{l.precioUnitario.toFixed(2)}</td>
                  <td className="num">
                    {(l.cantidad * l.precioUnitario).toFixed(2)}
                  </td>
                  <td className="num">{l.producto.stock ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {error && <p className="alert alert--error">{error}</p>}
          {msg && <p className="alert alert--ok">{msg}</p>}
          {pendientes > 0 && (
            <p className="muted">Ventas pendientes de sincronizar: {pendientes}</p>
          )}
        </section>

        {/* Panel derecho: total + teclado numérico */}
        <aside className="pos__panel">
          <div className="pos__totalbox">Total: {total.toFixed(2)}</div>
          <input className="pos__display" value={entrada} readOnly />
          <div className="keypad">
            {['1', '2', '3'].map((d) => (
              <button key={d} onClick={() => tecla(d)}>{d}</button>
            ))}
            <button className="k-act" onClick={() => aplicar('cantidad')}>CANTIDAD</button>
            {['4', '5', '6'].map((d) => (
              <button key={d} onClick={() => tecla(d)}>{d}</button>
            ))}
            <button className="k-act" onClick={() => aplicar('precio')}>PRECIO</button>
            {['7', '8', '9'].map((d) => (
              <button key={d} onClick={() => tecla(d)}>{d}</button>
            ))}
            <button className="k-act" onClick={() => aplicar('descuento')}>DESCUENTO</button>
            <button onClick={() => tecla('0')}>0</button>
            <button onClick={() => tecla(',')}>,</button>
            <button onClick={() => setEntrada('')}>Borrar</button>
            <button className="k-act" onClick={() => void pesar()}>⚖ Pesar</button>
          </div>
          <div className="pos__totales">
            <div><span>Sub Total:</span><span>{subTotal.toFixed(2)}</span></div>
            <div><span>IGV (18%):</span><span>0.00</span></div>
            <div><span>Descuento:</span><span>{descuento.toFixed(2)}</span></div>
          </div>
          <button
            className="pos__cobrar"
            disabled={carrito.length === 0}
            onClick={cobrar}
          >
            COBRAR
          </button>
        </aside>
      </div>
    </div>
  );
}
