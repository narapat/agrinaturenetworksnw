/**
 * Firestore จำลองในหน่วยความจำ (เฉพาะ API ที่ server routes ของโปรเจกต์นี้ใช้)
 * ใช้แทน firebase-admin Firestore ใน unit tests
 */

type Data = Record<string, any>;

const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

class FakeDocSnapshot {
  constructor(public ref: FakeDocRef, private _data: Data | undefined) {}
  get id() {
    return this.ref.id;
  }
  get exists() {
    return this._data !== undefined;
  }
  data() {
    return clone(this._data);
  }
}

class FakeQuerySnapshot {
  constructor(public docs: FakeDocSnapshot[]) {}
  get empty() {
    return this.docs.length === 0;
  }
  get size() {
    return this.docs.length;
  }
  forEach(fn: (d: FakeDocSnapshot) => void) {
    this.docs.forEach(fn);
  }
}

export class FakeDocRef {
  constructor(public store: FakeFirestore, public path: string) {}
  get id() {
    return this.path.split('/').pop()!;
  }
  collection(name: string) {
    return new FakeCollectionRef(this.store, `${this.path}/${name}`);
  }
  async get() {
    return new FakeDocSnapshot(this, clone(this.store.docs.get(this.path)));
  }
  async set(data: Data, opts?: { merge?: boolean }) {
    this.store._set(this.path, data, opts);
  }
  async update(data: Data) {
    if (!this.store.docs.has(this.path)) throw new Error(`NOT_FOUND: ${this.path}`);
    this.store._set(this.path, data, { merge: true });
  }
  async delete() {
    this.store.docs.delete(this.path);
  }
}

class FakeQuery {
  constructor(
    public store: FakeFirestore,
    public path: string,
    public filters: Array<{ field: string; op: string; value: any }> = []
  ) {}
  where(field: string, op: string, value: any) {
    // เหมือน Firestore จริง: undefined ใช้เป็นเงื่อนไขค้นหาไม่ได้
    if (value === undefined) {
      throw new Error('Value for argument "value" is not a valid query constraint. Cannot use "undefined" as a Firestore value.');
    }
    return new FakeQuery(this.store, this.path, [...this.filters, { field, op, value }]);
  }
  async get() {
    const prefix = `${this.path}/`;
    const docs: FakeDocSnapshot[] = [];
    for (const [p, data] of Array.from(this.store.docs.entries())) {
      if (!p.startsWith(prefix)) continue;
      if (p.slice(prefix.length).includes('/')) continue; // เฉพาะลูกตรง
      const ok = this.filters.every((f) => {
        const v = data[f.field];
        if (f.op === '==') return v === f.value;
        if (f.op === 'array-contains') return Array.isArray(v) && v.includes(f.value);
        if (f.op === 'in') return Array.isArray(f.value) && f.value.includes(v);
        throw new Error(`fake firestore: unsupported op ${f.op}`);
      });
      if (ok) docs.push(new FakeDocSnapshot(new FakeDocRef(this.store, p), clone(data)));
    }
    return new FakeQuerySnapshot(docs);
  }
}

export class FakeCollectionRef extends FakeQuery {
  constructor(store: FakeFirestore, path: string) {
    super(store, path);
  }
  doc(id: string) {
    return new FakeDocRef(this.store, `${this.path}/${id}`);
  }
}

class FakeBatch {
  private ops: Array<() => void> = [];
  constructor(private store: FakeFirestore) {}
  set(ref: FakeDocRef, data: Data, opts?: { merge?: boolean }) {
    this.ops.push(() => this.store._set(ref.path, data, opts));
    return this;
  }
  update(ref: FakeDocRef, data: Data) {
    this.ops.push(() => {
      if (!this.store.docs.has(ref.path)) throw new Error(`NOT_FOUND: ${ref.path}`);
      this.store._set(ref.path, data, { merge: true });
    });
    return this;
  }
  delete(ref: FakeDocRef) {
    this.ops.push(() => this.store.docs.delete(ref.path));
    return this;
  }
  async commit() {
    if (this.store.failNextCommit) {
      this.store.failNextCommit = false;
      throw new Error('Simulated commit failure');
    }
    // atomic: ทำบนสำเนา แล้วค่อยแทนที่
    const snapshot = new Map(this.store.docs);
    try {
      this.ops.forEach((op) => op());
      this.store.commits++;
    } catch (e) {
      this.store.docs = snapshot;
      throw e;
    }
  }
}

export class FakeFirestore {
  docs = new Map<string, Data>();
  commits = 0;
  failNextCommit = false;

  collection(name: string) {
    return new FakeCollectionRef(this, name);
  }
  batch() {
    return new FakeBatch(this);
  }
  async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    const batch = new FakeBatch(this);
    const tx = {
      get: (ref: FakeDocRef) => ref.get(),
      set: (ref: FakeDocRef, data: Data, opts?: { merge?: boolean }) => batch.set(ref, data, opts),
      update: (ref: FakeDocRef, data: Data) => batch.update(ref, data),
      delete: (ref: FakeDocRef) => batch.delete(ref),
    };
    const result = await fn(tx);
    await batch.commit();
    return result;
  }

  /** ตัวช่วยใน test */
  seed(path: string, data: Data) {
    this.docs.set(path, clone(data));
  }
  read(path: string): Data | undefined {
    return clone(this.docs.get(path));
  }
  paths(prefix = ''): string[] {
    return Array.from(this.docs.keys()).filter((p) => p.startsWith(prefix)).sort();
  }

  _set(path: string, data: Data, opts?: { merge?: boolean }) {
    const cleaned: Data = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) cleaned[k] = clone(v);
    }
    if (opts?.merge && this.docs.has(path)) {
      this.docs.set(path, { ...this.docs.get(path), ...cleaned });
    } else {
      this.docs.set(path, cleaned);
    }
  }
}
