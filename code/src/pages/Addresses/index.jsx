import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import CR_DIVISIONS from '../../data/crDivisions';
import { AddressSelect } from '../../components/ui/AddressSelect';
import {
  fetchUserAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../../services/addresses';
import BackButton from '../../components/ui/BackButton/BackButton';
import './Addresses.css';

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const StarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      stroke="#F2CA50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EMPTY_FORM = { label: '', province: '', city: '', district: '', address_line: '', is_default: false };

function AddressForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  const provincias = Object.keys(CR_DIVISIONS);
  const cantones   = form.province ? Object.keys(CR_DIVISIONS[form.province]) : [];
  const distritos  = form.province && form.city ? CR_DIVISIONS[form.province][form.city] : [];

  function set(key, val) {
    setForm(f => {
      const next = { ...f, [key]: val };
      if (key === 'province') { next.city = ''; next.district = ''; }
      if (key === 'city')     { next.district = ''; }
      return next;
    });
  }

  const canSave = form.province && form.city && form.district && form.address_line.trim();

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSave) return;
    onSave(form);
  }

  return (
    <form className="addr-form" onSubmit={handleSubmit}>
      <h3 className="addr-form__title">{initial ? 'Editar dirección' : 'Nueva dirección'}</h3>

      {/* Etiqueta */}
      <div className="addr-field">
        <span className="addr-field__label">Etiqueta (opcional)</span>
        <input
          className="addr-field__input"
          type="text"
          placeholder="Ej. Casa, Trabajo..."
          value={form.label}
          onChange={e => set('label', e.target.value)}
          maxLength={40}
        />
      </div>

      {/* Provincia */}
      <AddressSelect
        label="Provincia"
        value={form.province}
        onChange={v => set('province', v)}
        options={provincias}
        placeholder="Seleccionar provincia"
      />

      {/* Cantón */}
      <AddressSelect
        label="Cantón"
        value={form.city}
        onChange={v => set('city', v)}
        options={cantones}
        placeholder="Seleccionar cantón"
        disabled={!form.province}
      />

      {/* Distrito */}
      <AddressSelect
        label="Distrito"
        value={form.district}
        onChange={v => set('district', v)}
        options={distritos}
        placeholder="Seleccionar distrito"
        disabled={!form.city}
      />

      {/* Dirección específica */}
      <div className="addr-field">
        <span className="addr-field__label">Dirección específica</span>
        <input
          className="addr-field__input"
          type="text"
          placeholder="Número de casa, calle, señas..."
          value={form.address_line}
          onChange={e => set('address_line', e.target.value)}
        />
      </div>

      {/* Predeterminada */}
      <label className="addr-form__default-row">
        <div className="addr-form__checkbox-wrap">
          <input
            type="checkbox"
            className="addr-form__checkbox"
            checked={form.is_default}
            onChange={e => set('is_default', e.target.checked)}
          />
          <span className="addr-form__checkbox-custom" />
        </div>
        <span className="addr-form__default-label">Establecer como predeterminada</span>
      </label>

      <div className="addr-form__actions">
        <button
          type="submit"
          className="addr-form__btn addr-form__btn--primary"
          disabled={!canSave || saving}
        >
          {saving ? 'Guardando…' : 'Guardar dirección'}
        </button>
        <button
          type="button"
          className="addr-form__btn addr-form__btn--ghost"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function AddressCard({ addr, onEdit, onDelete, onSetDefault }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className={`addrcard ${addr.is_default ? 'addrcard--default' : ''}`}>
      <div className="addrcard__body">
        <div className="addrcard__top">
          <span className="addrcard__label">{addr.label || 'Dirección'}</span>
          {addr.is_default && <span className="addrcard__badge">Predeterminada</span>}
        </div>
        <span className="addrcard__location">
          {[addr.district, addr.city, addr.province].filter(Boolean).join(', ')}
        </span>
        <span className="addrcard__street">{addr.address_line}</span>
      </div>

      <div className="addrcard__actions">
        {!addr.is_default && (
          <button
            className="addrcard__action"
            onClick={() => onSetDefault(addr.id)}
            title="Establecer como predeterminada"
          >
            <StarIcon />
          </button>
        )}
        <button className="addrcard__action" onClick={() => onEdit(addr)} title="Editar">
          <EditIcon />
        </button>
        {confirmDelete ? (
          <div className="addrcard__confirm">
            <span>¿Eliminar?</span>
            <button className="addrcard__confirm-yes" onClick={() => onDelete(addr.id)}>Sí</button>
            <button className="addrcard__confirm-no" onClick={() => setConfirmDelete(false)}>No</button>
          </div>
        ) : (
          <button
            className="addrcard__action addrcard__action--danger"
            onClick={() => setConfirmDelete(true)}
            title="Eliminar"
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  );
}

export default function Addresses() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/addresses', { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchUserAddresses(user.id)
      .then(setAddresses)
      .catch(() => setAddresses([]))
      .finally(() => setLoading(false));
  }, [user]);

  function openAdd() { setEditing(null); setShowForm(true); setError(''); }
  function openEdit(addr) { setEditing(addr); setShowForm(true); setError(''); }
  function closeForm() { setShowForm(false); setEditing(null); }

  async function handleSave(formData) {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const updated = await updateAddress(editing.id, user.id, formData);
        setAddresses(prev => {
          let list = prev.map(a => a.id === updated.id ? updated : a);
          if (formData.is_default) list = list.map(a => ({ ...a, is_default: a.id === updated.id }));
          return list.sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
        });
      } else {
        const created = await createAddress(user.id, formData);
        setAddresses(prev => {
          let list = [...prev, created];
          if (formData.is_default) list = list.map(a => ({ ...a, is_default: a.id === created.id }));
          return list.sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
        });
      }
      closeForm();
    } catch (err) {
      setError(err.message ?? 'Error al guardar la dirección');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteAddress(id, user.id);
      setAddresses(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      setError(err.message ?? 'Error al eliminar');
    }
  }

  async function handleSetDefault(id) {
    try {
      await setDefaultAddress(id, user.id);
      setAddresses(prev =>
        prev
          .map(a => ({ ...a, is_default: a.id === id }))
          .sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0))
      );
    } catch (err) {
      setError(err.message ?? 'Error al actualizar');
    }
  }

  if (loading) return <div className="addresses-page addresses-page--loading" />;

  return (
    <div className="addresses-page">
      <div className="addresses-page__inner">

        <div className="addresses-page__header">
          <BackButton />
          <div className="addresses-page__header-row">
            <h1 className="addresses-page__title">Mis Direcciones</h1>
            {!showForm && (
              <button className="addresses-page__add-btn" onClick={openAdd}>
                <PlusIcon />
                Agregar
              </button>
            )}
          </div>
        </div>

        {error && <p className="addresses-page__error">{error}</p>}

        {showForm && (
          <AddressForm
            initial={editing ? {
              label:        editing.label ?? '',
              province:     editing.province,
              city:         editing.city,
              district:     editing.district ?? '',
              address_line: editing.address_line,
              is_default:   editing.is_default,
            } : null}
            onSave={handleSave}
            onCancel={closeForm}
            saving={saving}
          />
        )}

        {!showForm && (
          <>
            {addresses.length === 0 ? (
              <div className="addresses-page__empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                    stroke="rgba(242,202,80,0.3)" strokeWidth="1.5"/>
                  <circle cx="12" cy="9" r="2.5" stroke="rgba(242,202,80,0.3)" strokeWidth="1.5"/>
                </svg>
                <p>Aún no tienes direcciones guardadas.</p>
                <span>Agrega una para agilizar el proceso de compra.</span>
              </div>
            ) : (
              <div className="addresses-page__list">
                {addresses.map(addr => (
                  <AddressCard
                    key={addr.id}
                    addr={addr}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onSetDefault={handleSetDefault}
                  />
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
