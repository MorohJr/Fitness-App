// תרגיל חדש שלי
import { addCustomExercise } from '../../../data/repos/exercises';
import { getProfile } from '../../../data/repos/profile';
import { useLive } from '../../hooks';
import { BackLink } from '../../components/Fields';
import { navigate } from '../../router';
import { showToast } from '../../store';
import { ExerciseForm, emptyForm } from './ExerciseForm';

export function NewExerciseScreen() {
  const profile = useLive(getProfile);
  if (!profile) return null;
  return (
    <div>
      <BackLink to="/workout/library" label="מאגר תרגילים" />
      <h1>תרגיל חדש</h1>
      <ExerciseForm
        initial={emptyForm()}
        editIdentity
        equipmentList={profile.equipment}
        submitLabel="הוסף למאגר"
        onCancel={() => navigate('/workout/library')}
        onSubmit={async (v) => {
          const ex = await addCustomExercise(v);
          showToast('התרגיל נוסף. הסטטוס שלו 🔴 עד שתבדוק אותו');
          navigate(`/workout/exercise/${ex.id}`);
        }}
      />
    </div>
  );
}
