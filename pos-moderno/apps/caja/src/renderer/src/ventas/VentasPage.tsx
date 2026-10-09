import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ProductoDTO,
  RegistrarVentaDTO,
  UsuarioAutenticadoDTO,
} from '@pos/types';
import { obtenerProductos } from '../api';

interface Props {
  idCaja: number;
  idUsuario: number;
  usuario?: UsuarioAutenticadoDTO;
  onIr?: (tab: string) => void;
  onCerrarTurno?: () => void;
}

interface LineaVenta {
  producto: ProductoDTO;
  cantidad: number;
  precioUnitario: number;
}

type Modo = 'lectora' | 'teclado';
const IVA = 0.16;

export function VentasPage({
  idCaja,
  idUsuario,
  usuario,
  onIr,
  onCerrarTurno,
}: Props): JSX.Element {
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [carrito, setCarrito] = useState<LineaVenta[]>([]);
  const [espera, setEspera] = useState<LineaVenta[][]>([]);
  const [modo, setModo] = useState<Modo>('lectora');
  const [busqueda, setBusqueda] = useState('');
  const [sel, setSel] = useState<number | null>(null);
  const [entrada, setEntrada] = useState('');
  const [mayoreo, setMayoreo] = useState(false);
  const [oscuro, setOscuro] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const buscarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    obtenerProductos().then(setProductos).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    buscarRef.current?.focus();
  }, [modo]);

  const precioDe = useCallback(
    (p: ProductoDTO): number =>
      mayoreo && p.precioMayoreo ? p.precioMayoreo : p.precioVenta ?? 0,
    [mayoreo],
  );

  const sugerencias = useMemo(() => {
    if (!busqueda.trim()) return [];
    const q = busqueda.toLowerCase();
    return productos
      .filter(
        (p) =>
          (p.descripcion ?? '').toLowerCase().includes(q) ||
          (p.codigo ?? '').toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [busqueda, productos]);

  const total = carrito.reduce((a, l) => a + l.cantidad * l.precioUnitario, 0);
  const subTotal = total / (1 + IVA);
  const iva = total - subTotal;

  const agregar = useCallback(
    (p: ProductoDTO, cantidad = 1): void => {
      setCarrito((prev) => {
        const i = prev.findIndex((l) => l.producto.id === p.id);
        if (i >= 0) {
          const c = [...prev];
          c[i] = { ...c[i], cantidad: c[i].cantidad + cantidad };
          return c;
        }
        return [...prev, { producto: p, cantidad, precioUnitario: precioDe(p) }];
      });
      setError(null);
      setMsg(null);
    },
    [precioDe],
  );

  function onBuscarKey(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key !== 'Enter') return;
    const q = busqueda.trim();
    if (!q) return;
    const ql = q.toLowerCase();
    const p =
      productos.find((x) => (x.codigo ?? '') === q) ??
      productos.find(
        (x) =>
          (x.descripcion ?? '').toLowerCase().includes(ql) ||
          (x.codigo ?? '').toLowerCase().includes(ql),
      );
    if (p) agregar(p);
    else setError(`No se encontró "${q}"`);
    setBusqueda('');
  }

  function cambiarCantidad(i: number, d: number): void {
    setCarrito((prev) =>
      prev
        .map((l, idx) => (idx === i ? { ...l, cantidad: Math.max(0, l.cantidad + d) } : l))
        .filter((l) => l.cantidad > 0),
    );
  }
  function quitar(i: number): void {
    setCarrito((prev) => prev.filter((_, idx) => idx !== i));
    setSel(null);
  }

  function tecla(d: string): void {
    setEntrada((e) => (d === ',' ? (e.includes('.') ? e : e + '.') : e + d));
  }
  function aplicar(campo: 'cantidad' | 'precio'): void {
    const v = Number(entrada);
    if (Number.isNaN(v) || sel == null) {
      setError('Selecciona una línea y escribe un número');
      return;
    }
    setCarrito((prev) =>
      prev.map((l, i) =>
        i === sel
          ? campo === 'cantidad'
            ? { ...l, cantidad: v }
            : { ...l, precioUnitario: v }
          : l,
      ),
    );
    setEntrada('');
  }

  function toggleMayoreo(): void {
    setMayoreo((m) => {
      const nm = !m;
      setCarrito((prev) =>
        prev.map((l) => ({
          ...l,
          precioUnitario:
            nm && l.producto.precioMayoreo
              ? l.producto.precioMayoreo
              : l.producto.precioVenta ?? 0,
        })),
      );
      return nm;
    });
  }

  function ponerEnEspera(): void {
    if (carrito.length === 0) return;
    setEspera((prev) => [...prev, carrito]);
    setCarrito([]);
    setMsg('Venta puesta en espera.');
  }
  function restaurar(): void {
    setEspera((prev) => {
      if (prev.length === 0) return prev;
      const ultima = prev[prev.length - 1];
      setCarrito(ultima);
      return prev.slice(0, -1);
    });
  }

  const cobrar = useCallback(async (): Promise<void> => {
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
      setSel(null);
      buscarRef.current?.focus();
    } catch (e) {
      setError((e as Error).message);
    }
  }, [carrito, idCaja, idUsuario, total]);

  // Atajos de teclado F1 (lectora), F2 (teclado), F3 (cobrar).
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'F1') {
        e.preventDefault();
        setModo('lectora');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setModo('teclado');
      } else if (e.key === 'F3') {
        e.preventDefault();
        void cobrar();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cobrar]);

  const credito = (): void => setMsg('Gestión de créditos: próximamente.');

  return (
    <div className={oscuro ? 'pos pos--dark' : 'pos'}>
      {/* Barra superior */}
      <div className="pos__top">
        <div className="pos__brand">🖥️ PSE</div>
        <input
          ref={buscarRef}
          className="pos__input"
          placeholder={
            modo === 'teclado'
              ? 'Buscar con TECLADO (nombre o código)'
              : 'Buscar con LECTORA de Codigos de Barras'
          }
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={onBuscarKey}
        />
        <div className="pos__toggle">
          <button className={modo === 'lectora' ? 'on' : ''} onClick={() => setModo('lectora')}>📷 Lectora (F1)</button>
          <button className={modo === 'teclado' ? 'on' : ''} onClick={() => setModo('teclado')}>⌨ Teclado (F2)</button>
        </div>
        <div className="pos__user">👑 {usuario?.nombres ?? usuario?.login ?? 'Usuario'}</div>
      </div>

      {/* Acciones rápidas */}
      <div className="pos__acts">
        <button onClick={() => onIr?.('cobros')}>💳 Cobros</button>
        <button onClick={credito}>👥 Aperturar Credito por Cobrar</button>
        <button onClick={credito}>🧍 Aperturar Credito por Pagar</button>
        <button className={mayoreo ? 'act-on' : ''} onClick={toggleMayoreo}>🪙 Mayoreo</button>
        <button onClick={() => onIr?.('movimientos')}>↩ Ingreso dinero</button>
        <button onClick={() => onIr?.('movimientos')}>↪ Salida dinero</button>
      </div>

      <div className="pos__ctas">
        <button className="cta cta--blue" onClick={() => onIr?.('movimientos')}>Ver Ingresos y Salidas</button>
        <button className="cta cta--orange" onClick={() => onCerrarTurno?.()}>Cerrar Turno</button>
        <button className="cta cta--orange" onClick={() => onIr?.('compras')}>Comprar</button>
      </div>

      {sugerencias.length > 0 && (
        <ul className="pos__sugerencias">
          {sugerencias.map((p) => (
            <li key={p.id} onClick={() => { agregar(p); setBusqueda(''); buscarRef.current?.focus(); }}>
              <span>{p.descripcion}</span>
              <span className="muted">{p.codigo} · {precioDe(p).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="pos__body">
        <section className="pos__cart">
          <table>
            <thead>
              <tr><th></th><th></th><th></th><th>Producto</th><th className="num">Cant</th><th className="num">P_Unit</th><th className="num">Importe</th><th className="num">Stock</th></tr>
            </thead>
            <tbody>
              {carrito.map((l, i) => (
                <tr key={l.producto.id} className={sel === i ? 'sel' : ''} onClick={() => setSel(i)}>
                  <td><button className="x" onClick={() => quitar(i)}>✕</button></td>
                  <td><button onClick={() => cambiarCantidad(i, 1)}>+</button></td>
                  <td><button onClick={() => cambiarCantidad(i, -1)}>−</button></td>
                  <td>{l.producto.descripcion}</td>
                  <td className="num">{l.cantidad.toFixed(2)}</td>
                  <td className="num">{l.precioUnitario.toFixed(2)}</td>
                  <td className="num">{(l.cantidad * l.precioUnitario).toFixed(2)}</td>
                  <td className="num">{l.producto.stock ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {error && <p className="alert alert--error">{error}</p>}
          {msg && <p className="alert alert--ok">{msg}</p>}
        </section>

        <aside className="pos__panel">
          <div className="pos__totalbox">{total.toFixed(2)}</div>
          <input className="pos__display" value={entrada} readOnly />
          <div className="keypad">
            {['1', '2', '3'].map((d) => (<button key={d} onClick={() => tecla(d)}>{d}</button>))}
            <button className="k-act" onClick={() => aplicar('cantidad')}>CANT</button>
            {['4', '5', '6'].map((d) => (<button key={d} onClick={() => tecla(d)}>{d}</button>))}
            <button className="k-act" onClick={() => aplicar('precio')}>PREC</button>
            {['7', '8', '9'].map((d) => (<button key={d} onClick={() => tecla(d)}>{d}</button>))}
            <button className="k-act" onClick={() => setEntrada('')}>Borrar</button>
            <button onClick={() => tecla('0')}>0</button>
            <button onClick={() => tecla(',')}>,</button>
            <button onClick={() => setEntrada((e) => e.slice(0, -1))}>⌫</button>
          </div>
          <div className="pos__totales">
            <div><span>Sub Total:</span><span>{subTotal.toFixed(2)}</span></div>
            <div><span>IVA (16%):</span><span>{iva.toFixed(2)}</span></div>
          </div>
          <button className="pos__cobrar" disabled={carrito.length === 0} onClick={() => void cobrar()}>
            Cobrar (F3)
          </button>
        </aside>
      </div>

      {/* Barra inferior */}
      <div className="pos__bottom">
        <button onClick={ponerEnEspera}>⏸ Poner en Espera{espera.length ? ` (${espera.length})` : ''}</button>
        <button onClick={restaurar} disabled={espera.length === 0}>▶ Restaurar</button>
        <button onClick={() => { setCarrito([]); setSel(null); }}>✎ Eliminar</button>
        <span className="pos__bottom-right">
          <button onClick={() => onIr?.('reportes')}>∑ Ver ventas del día y Devoluciones</button>
          <button onClick={() => setOscuro((o) => !o)}>{oscuro ? '☀ Tema Claro' : '🌙 Tema Oscuro'}</button>
        </span>
      </div>
    </div>
  );
}
