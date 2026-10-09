interface Item {
  k: string;
  label: string;
  icon: string;
}
interface Grupo {
  titulo: string;
  items: Item[];
}

const GRUPOS: Grupo[] = [
  {
    titulo: 'Generales',
    items: [
      { k: 'empresa', label: 'Empresa', icon: '🏪' },
      { k: 'usuarios', label: 'Usuarios', icon: '👥' },
      { k: 'cajas', label: 'Cajas', icon: '🧾' },
      { k: 'serializacion', label: 'Serializacion', icon: '🔢' },
      { k: 'productos', label: 'Productos', icon: '🧃' },
      { k: 'clientes', label: 'Clientes', icon: '❤️' },
      { k: 'proveedores', label: 'Proveedores', icon: '🧑‍💼' },
    ],
  },
  {
    titulo: 'Personalizacion',
    items: [{ k: 'comprobantes', label: 'Diseño de Comprobantes', icon: '🧾' }],
  },
  {
    titulo: 'Dispositivos',
    items: [
      { k: 'impresoras', label: 'Impresoras', icon: '🖨️' },
      { k: 'balanza', label: 'Balanza', icon: '⚖️' },
    ],
  },
  {
    titulo: 'Notificaciones',
    items: [{ k: 'correo', label: 'Notificaciones por Correo Electronico', icon: '✉️' }],
  },
  {
    titulo: 'Mantenimiento',
    items: [{ k: 'respaldo', label: 'Respaldo de Base de datos', icon: '🗄️' }],
  },
];

export function ConfiguracionesView({
  onAbrir,
  onVolver,
}: {
  onAbrir: (k: string) => void;
  onVolver: () => void;
}): JSX.Element {
  return (
    <div className="cfg">
      <button className="cfg__back" onClick={onVolver}>👑 Volver al Administrador</button>
      <div className="cfg__groups">
        {GRUPOS.map((g) => (
          <section key={g.titulo} className="cfg__group">
            <h3>{g.titulo}</h3>
            <div className="cfg__items">
              {g.items.map((it) => (
                <button key={it.k} className="cfg__item" onClick={() => onAbrir(it.k)}>
                  <span className="cfg__icon">{it.icon}</span>
                  <span className="cfg__label">{it.label}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
