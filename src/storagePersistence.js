export function readStoredValue(storage, key, initialValue, validateValue = () => true) {
  try {
    const raw = storage.getItem(key);
    if (raw == null) return { value: initialValue, error: null, readFailed: false, missing: true };
    const value = JSON.parse(raw);
    if (!validateValue(value)) throw new SyntaxError('Stored data has an invalid structure.');
    return { value, error: null, readFailed: false, missing: false };
  } catch (error) {
    return { value: initialValue, error, readFailed: true, missing: false };
  }
}

export function writeStoredValue(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return { saved: true };
  } catch (error) {
    return { saved: false, error };
  }
}

export function resolveStorageRetry(storage, key, validateValue, confirmReplace) {
  let raw;
  try {
    raw = storage.getItem(key);
  } catch (error) {
    const confirmed = confirmReplace(
      'The saved value is still unreadable. Saving this session may replace existing data. Continue?',
    );
    return confirmed ? { action: 'save-current' } : { action: 'cancel', error };
  }

  if (raw == null) return { action: 'save-current' };

  let existingValue;
  try {
    existingValue = JSON.parse(raw);
    if (!validateValue(existingValue)) throw new SyntaxError('Stored data has an invalid structure.');
  } catch (error) {
    const confirmed = confirmReplace(
      'The saved value is invalid or corrupted. Saving this session will replace it. Continue?',
    );
    return confirmed ? { action: 'save-current' } : { action: 'cancel', error };
  }

  const confirmed = confirmReplace(
    'Saved data is readable again. Replace it with this session’s changes? Choose Cancel to recover the saved data.',
  );
  return confirmed
    ? { action: 'save-current' }
    : { action: 'recover-existing', value: existingValue };
}
