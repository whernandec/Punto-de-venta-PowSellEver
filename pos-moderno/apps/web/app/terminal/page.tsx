'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function TerminalPage(): JSX.Element {
  const [tokenConfigurado, setTokenConfigurado] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [simulacion, setSimulacion] = useState(true);
  const [devices, setDevices] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api
      .terminal()
      .then((c) => {
        setEnabled(Boolean(c.enabled));
        setSimulacion(c.simulacion !== false);
        setDeviceId(String(c.deviceId ?? ''));
        setStoreId(String(c.storeId ?? ''));
        setTokenConfigurado(Boolean(c.tokenConfigurado));
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function guardar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await api.guardarTerminal({
        enabled,
        simulacion,
        deviceId,
        storeId,
        ...(accessToken ? { accessToken } : {}),
      });
      setAccessToken('');
      setTokenConfigurado(tokenConfigurado || !!accessToken);
      setMsg('Configuración guardada.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function probar(): Promise<void> {
    setError(null);
    try {
      setDevices(await api.dispositivosTerminal());
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <h2>Terminal — Mercado Pago</h2>
      {error && <p className="alert alert--error">{error}</p>}
      {msg && <p className="alert alert--ok">{msg}</p>}

      <div className="panel" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', maxWidth: 640 }}>
        <strong>¿Cómo configurar tu terminal?</strong>
        <ol style={{ margin: '8px 0', paddingLeft: 20 }}>
          <li>Crea una aplicación (tipo “Pagos presenciales / Point”) en{' '}
            <a href="https://www.mercadopago.com/developers/panel/app" target="_blank" rel="noreferrer">el panel de Mercado Pago ↗</a>.
          </li>
          <li>En <em>Credenciales</em> copia el <strong>Access Token</strong> (<code>APP_USR-…</code>), pégalo abajo y pulsa <strong>Guardar</strong>.</li>
          <li>Pulsa <strong>Probar dispositivos</strong> y elige tu terminal con <strong>Usar</strong>.</li>
          <li>Pulsa <strong>Modo PDV</strong> para ponerla en modo integrado.</li>
          <li>Marca <strong>Habilitar</strong> y desactiva <strong>Simulación</strong>.</li>
        </ol>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <a href="https://www.mercadopago.com/developers/es/docs/mp-point/landing" target="_blank" rel="noreferrer">📄 Documentación Point ↗</a>
          <a href="https://www.mercadopago.com/developers/panel/app" target="_blank" rel="noreferrer">🔑 Obtener Access Token ↗</a>
        </div>
      </div>

      <form className="panel" onSubmit={guardar} style={{ maxWidth: 560 }}>
        <div className="row" style={{ marginBottom: 10 }}>
          <label><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Habilitar cobro con terminal</label>
        </div>
        <div className="row" style={{ marginBottom: 10 }}>
          <label><input type="checkbox" checked={simulacion} onChange={(e) => setSimulacion(e.target.checked)} /> Modo simulación (sin hardware)</label>
        </div>
        <div className="row" style={{ marginBottom: 10 }}>
          <label style={{ width: 130 }}>Access Token</label>
          <input type="password" style={{ flex: 1 }} placeholder={tokenConfigurado ? '•••••• (guardado)' : 'APP_USR-...'} value={accessToken} onChange={(e) => setAccessToken(e.target.value)} />
        </div>
        <div className="row" style={{ marginBottom: 10 }}>
          <label style={{ width: 130 }}>Device ID</label>
          <input style={{ flex: 1 }} value={deviceId} onChange={(e) => setDeviceId(e.target.value)} />
        </div>
        <div className="row" style={{ marginBottom: 10 }}>
          <label style={{ width: 130 }}>Store ID</label>
          <input style={{ flex: 1 }} value={storeId} onChange={(e) => setStoreId(e.target.value)} />
        </div>
        <div className="row">
          <button className="btn" type="submit">Guardar</button>
          <button className="btn btn--ghost" type="button" onClick={probar}>Probar dispositivos</button>
        </div>
      </form>

      {devices.length > 0 && (
        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Dispositivo</th><th>ID</th><th></th></tr></thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td><button className="btn btn--ghost" onClick={() => setDeviceId(d.id)}>Usar {d.id}</button></td>
                <td><button className="btn btn--ghost" onClick={() => { void api.modoTerminal(d.id, 'PDV').then(() => setMsg('Terminal en modo PDV')).catch((e: Error) => setError(e.message)); }}>Modo PDV</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
