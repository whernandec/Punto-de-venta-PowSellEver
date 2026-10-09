import { useEffect, useState } from 'react';
import {
  dispositivosTerminal,
  guardarTerminal,
  modoTerminal,
  obtenerTerminal,
  type TerminalConfig,
} from '../api';

export function TerminalMPView(): JSX.Element {
  const [cfg, setCfg] = useState<TerminalConfig | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [simulacion, setSimulacion] = useState(true);
  const [devices, setDevices] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    obtenerTerminal()
      .then((c) => {
        setCfg(c);
        setDeviceId(c.deviceId);
        setStoreId(c.storeId);
        setEnabled(c.enabled);
        setSimulacion(c.simulacion);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function guardar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      const c = await guardarTerminal({
        enabled,
        simulacion,
        deviceId,
        storeId,
        ...(accessToken ? { accessToken } : {}),
      });
      setCfg(c);
      setAccessToken('');
      setMsg('Configuración de terminal guardada.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function probar(): Promise<void> {
    setError(null);
    try {
      setDevices(await dispositivosTerminal());
      setMsg('Dispositivos obtenidos.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function ponerModoPDV(id: string): Promise<void> {
    setError(null);
    try {
      await modoTerminal(id, 'PDV');
      setMsg(`Terminal ${id} puesta en modo integrado (PDV).`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="page" style={{ maxWidth: 620 }}>
      <h2>Terminal — Mercado Pago</h2>
      {error && <p className="alert alert--error">{error}</p>}
      {msg && <p className="alert alert--ok">{msg}</p>}

      <div className="instructivo">
        <strong>¿Cómo configurar tu terminal?</strong>
        <ol>
          <li>
            Crea una aplicación en el panel de Mercado Pago (tipo “Pagos presenciales / Point”):{' '}
            <a href="https://www.mercadopago.com/developers/panel/app" target="_blank" rel="noreferrer">
              Abrir panel de Mercado Pago ↗
            </a>
          </li>
          <li>
            En <em>Credenciales</em> copia el <strong>Access Token</strong> (producción
            <code> APP_USR-… </code>) y pégalo abajo. Luego pulsa <strong>Guardar</strong>.
          </li>
          <li>
            Pulsa <strong>Probar dispositivos</strong> para listar tus terminales y elige
            <strong> “Usar”</strong>. (Tu terminal debe estar comprada y asociada a tu cuenta MP.)
          </li>
          <li>
            Pulsa <strong>“Modo integrado (PDV)”</strong> en tu terminal para que reciba cobros
            desde el sistema.
          </li>
          <li>
            Marca <strong>Habilitar cobro con terminal</strong> y desactiva
            <strong> Simulación</strong>.
          </li>
        </ol>
        <div className="instructivo__links">
          <a href="https://www.mercadopago.com/developers/es/docs/mp-point/landing" target="_blank" rel="noreferrer">📄 Documentación Mercado Pago Point ↗</a>
          <a href="https://www.mercadopago.com/developers/panel/app" target="_blank" rel="noreferrer">🔑 Obtener Access Token ↗</a>
        </div>
      </div>

      <form className="panel" onSubmit={guardar}>
        <div className="row" style={{ marginBottom: 10 }}>
          <label><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Habilitar cobro con terminal</label>
        </div>
        <div className="row" style={{ marginBottom: 10 }}>
          <label><input type="checkbox" checked={simulacion} onChange={(e) => setSimulacion(e.target.checked)} /> Modo simulación (sin hardware real)</label>
        </div>
        <div className="row" style={{ marginBottom: 10 }}>
          <label style={{ width: 150 }}>Access Token</label>
          <input
            type="password"
            style={{ flex: 1 }}
            placeholder={cfg?.tokenConfigurado ? '•••••• (guardado)' : 'APP_USR-...'}
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
          />
        </div>
        <div className="row" style={{ marginBottom: 10 }}>
          <label style={{ width: 150 }}>Device ID</label>
          <input style={{ flex: 1 }} value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="PAX_A910__..." />
        </div>
        <div className="row" style={{ marginBottom: 10 }}>
          <label style={{ width: 150 }}>Store ID (opcional)</label>
          <input style={{ flex: 1 }} value={storeId} onChange={(e) => setStoreId(e.target.value)} />
        </div>
        <div className="row">
          <button className="btn btn--primary" type="submit">Guardar</button>
          <button className="btn" type="button" onClick={() => void probar()}>Probar dispositivos</button>
        </div>
      </form>

      {devices.length > 0 && (
        <table className="tabla" style={{ marginTop: 12 }}>
          <thead><tr><th>Dispositivo</th><th>ID</th><th></th></tr></thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>
                  <button onClick={() => setDeviceId(d.id)}>Usar {d.id}</button>
                </td>
                <td>
                  <button onClick={() => void ponerModoPDV(d.id)}>Modo integrado (PDV)</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="muted" style={{ marginTop: 12 }}>
        En modo simulación los cobros se aprueban automáticamente (para pruebas sin
        terminal física). Para producción, desactiva simulación y configura tu Access
        Token y Device ID de Mercado Pago Point.
      </p>
    </main>
  );
}
