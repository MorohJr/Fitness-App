// ציוד ומיקומים (4.1)
import { useEffect, useState } from 'preact/hooks';
import type { EquipmentItem, LocationSetup } from '../../../domain/types';
import { getProfile, updateProfile } from '../../../data/repos/profile';
import { useLive } from '../../hooks';
import { BackLink } from '../../components/Fields';
import { showToast } from '../../store';

export function EquipmentScreen() {
  const profile = useLive(getProfile);
  const [equipment, setEquipment] = useState<EquipmentItem[] | null>(null);
  const [locations, setLocations] = useState<LocationSetup[] | null>(null);
  const [newName, setNewName] = useState('');
  useEffect(() => {
    if (profile && !equipment) {
      setEquipment(structuredClone(profile.equipment));
      setLocations(structuredClone(profile.locations));
    }
  }, [profile]);
  if (!equipment || !locations) return null;

  const toggle = (locId: string, eqId: string, on: boolean) =>
    setLocations(locations.map((l) => (l.id !== locId ? l : { ...l, equipmentIds: on ? [...l.equipmentIds, eqId] : l.equipmentIds.filter((x) => x !== eqId) })));

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    setEquipment([...equipment, { id: `custom-${crypto.randomUUID().slice(0, 8)}`, name }]);
    setNewName('');
  };

  const remove = (id: string) => {
    setEquipment(equipment.filter((e) => e.id !== id));
    setLocations(locations.map((l) => ({ ...l, equipmentIds: l.equipmentIds.filter((x) => x !== id) })));
  };

  async function save() {
    await updateProfile({ equipment: equipment!, locations: locations! });
    showToast('הציוד נשמר');
  }

  return (
    <div>
      <BackLink />
      <h1>ציוד ומיקומים</h1>
      {locations.map((loc) => (
        <div class="card" key={loc.id}>
          <label class="check" style={{ fontWeight: 700 }}>
            <input type="checkbox" checked={loc.enabled} onChange={(e) => setLocations(locations.map((l) => (l.id === loc.id ? { ...l, enabled: (e.currentTarget as HTMLInputElement).checked } : l)))} />
            {loc.name}
          </label>
          {loc.enabled &&
            equipment.map((eq) => (
              <label class="check" key={eq.id}>
                <input type="checkbox" checked={loc.equipmentIds.includes(eq.id)} onChange={(e) => toggle(loc.id, eq.id, (e.currentTarget as HTMLInputElement).checked)} />
                {eq.name}
              </label>
            ))}
        </div>
      ))}
      <div class="card">
        <h2>רשימת הציוד</h2>
        <div class="list">
          {equipment.map((eq) => (
            <div class="item" key={eq.id}>
              <span>{eq.name}</span>
              <button class="btn danger" onClick={() => remove(eq.id)} aria-label={`הסר ${eq.name}`}>
                הסר
              </button>
            </div>
          ))}
        </div>
        <div class="input-wrap">
          <input class="input" placeholder="ציוד חדש, למשל טבעות" value={newName} onInput={(e) => setNewName((e.currentTarget as HTMLInputElement).value)} />
          <button class="btn" onClick={add}>
            הוסף
          </button>
        </div>
      </div>
      <button class="btn primary block" onClick={save}>
        שמור
      </button>
    </div>
  );
}
