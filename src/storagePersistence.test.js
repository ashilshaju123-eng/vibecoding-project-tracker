import test from 'node:test';
import assert from 'node:assert/strict';
import { readStoredValue, resolveStorageRetry, writeStoredValue } from './storagePersistence.js';

function createStorage(initialEntries = {}) {
  const entries = new Map(Object.entries(initialEntries));
  const storage = {
    writes: 0,
    getItem(key) { return entries.has(key) ? entries.get(key) : null; },
    setItem(key, value) {
      this.writes += 1;
      entries.set(key, value);
    },
    entries,
  };
  return storage;
}

const isArray = Array.isArray;

test('read failure keeps defaults in memory without writing over stored data', () => {
  const storage = createStorage({ tasks: '[{"saved":true}]' });
  storage.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };

  const result = readStoredValue(storage, 'tasks', [], isArray);

  assert.deepEqual(result.value, []);
  assert.equal(result.readFailed, true);
  assert.equal(storage.writes, 0);
  assert.equal(storage.entries.get('tasks'), '[{"saved":true}]');
});

test('corrupted JSON is reported and left untouched', () => {
  const storage = createStorage({ tasks: '{broken' });

  const result = readStoredValue(storage, 'tasks', [], isArray);

  assert.equal(result.readFailed, true);
  assert.ok(result.error instanceof SyntaxError);
  assert.equal(storage.writes, 0);
  assert.equal(storage.entries.get('tasks'), '{broken');
});

test('write failures are returned to the caller', () => {
  const storage = createStorage();
  storage.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };

  const result = writeStoredValue(storage, 'tasks', [{ id: 'task-1' }]);

  assert.equal(result.saved, false);
  assert.equal(result.error.name, 'QuotaExceededError');
});

test('retry recovers readable existing data when replacement is declined', () => {
  const original = [{ id: 'saved-task' }];
  const storage = createStorage({ tasks: JSON.stringify(original) });
  let prompt = '';

  const result = resolveStorageRetry(storage, 'tasks', isArray, (message) => {
    prompt = message;
    return false;
  });

  assert.equal(result.action, 'recover-existing');
  assert.deepEqual(result.value, original);
  assert.match(prompt, /Choose Cancel to recover the saved data/);
  assert.equal(storage.writes, 0);
});

test('retry requires confirmation before replacing readable existing data', () => {
  const storage = createStorage({ tasks: JSON.stringify([{ id: 'saved-task' }]) });

  const result = resolveStorageRetry(storage, 'tasks', isArray, (message) => {
    assert.match(message, /Replace it with this session’s changes/);
    return true;
  });

  assert.equal(result.action, 'save-current');
  assert.equal(storage.writes, 0);
  assert.deepEqual(JSON.parse(storage.entries.get('tasks')), [{ id: 'saved-task' }]);
});

test('retry requires confirmation before replacing unreadable data', () => {
  const storage = createStorage({ tasks: '{broken' });
  let prompt = '';

  const result = resolveStorageRetry(storage, 'tasks', isArray, (message) => {
    prompt = message;
    return false;
  });

  assert.equal(result.action, 'cancel');
  assert.match(prompt, /will replace it/);
  assert.equal(storage.writes, 0);
  assert.equal(storage.entries.get('tasks'), '{broken');
});

test('confirmed retry can replace unreadable data with current in-memory data', () => {
  const storage = createStorage({ tasks: '{broken' });
  const current = [{ id: 'session-task' }];
  const decision = resolveStorageRetry(storage, 'tasks', isArray, () => true);
  assert.equal(decision.action, 'save-current');

  const write = writeStoredValue(storage, 'tasks', current);

  assert.equal(write.saved, true);
  assert.deepEqual(JSON.parse(storage.entries.get('tasks')), current);
});

test('retry asks before replacing a value while storage is still inaccessible', () => {
  const storage = createStorage();
  storage.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  let prompt = '';

  const result = resolveStorageRetry(storage, 'tasks', isArray, (message) => {
    prompt = message;
    return false;
  });

  assert.equal(result.action, 'cancel');
  assert.match(prompt, /may replace existing data/);
  assert.equal(storage.writes, 0);
});
