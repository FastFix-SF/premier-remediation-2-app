import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineQueueDB extends DBSchema {
  photoQueue: {
    key: string;
    value: {
      id: string;
      projectId: string;
      file: File;
      note?: string;
      capturedAt: string;
      retryCount: number;
      status: 'pending' | 'uploading' | 'failed' | 'completed';
      createdAt: string;
    };
  };
  noteQueue: {
    key: string;
    value: {
      id: string;
      projectId: string;
      content: string;
      createdAt: string;
      status: 'pending' | 'syncing' | 'failed' | 'completed';
    };
  };
  timeClockQueue: {
    key: string;
    value: {
      id: string;
      entryId: string;
      userId: string;
      action: 'clock_out' | 'start_break' | 'end_break';
      clockOutTime?: string;
      totalHours?: number;
      retryCount: number;
      status: 'pending' | 'syncing' | 'failed' | 'completed';
      createdAt: string;
    };
  };
}

class OfflineQueueManager {
  private db: IDBPDatabase<OfflineQueueDB> | null = null;

  async init() {
    if (this.db) return this.db;
    
    this.db = await openDB<OfflineQueueDB>('OfflineQueue', 2, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('photoQueue')) {
          db.createObjectStore('photoQueue', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('noteQueue')) {
          db.createObjectStore('noteQueue', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('timeClockQueue')) {
          db.createObjectStore('timeClockQueue', { keyPath: 'id' });
        }
      },
    });
    
    return this.db;
  }

  async addPhotoToQueue(projectId: string, file: File, note?: string) {
    const db = await this.init();
    const id = crypto.randomUUID();
    
    const queueItem = {
      id,
      projectId,
      file,
      note,
      capturedAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };

    await db.put('photoQueue', queueItem);
    return id;
  }

  async addNoteToQueue(projectId: string, content: string) {
    const db = await this.init();
    const id = crypto.randomUUID();
    
    const queueItem = {
      id,
      projectId,
      content,
      createdAt: new Date().toISOString(),
      status: 'pending' as const,
    };

    await db.put('noteQueue', queueItem);
    return id;
  }

  async getPendingPhotos() {
    const db = await this.init();
    const allPhotos = await db.getAll('photoQueue');
    return allPhotos.filter(photo => photo.status === 'pending');
  }

  async getPendingNotes() {
    const db = await this.init();
    const allNotes = await db.getAll('noteQueue');
    return allNotes.filter(note => note.status === 'pending');
  }

  async updatePhotoStatus(id: string, status: 'pending' | 'uploading' | 'failed' | 'completed') {
    const db = await this.init();
    const photo = await db.get('photoQueue', id);
    if (photo) {
      photo.status = status;
      if (status === 'failed') {
        photo.retryCount = (photo.retryCount || 0) + 1;
      }
      await db.put('photoQueue', photo);
    }
  }

  async updateNoteStatus(id: string, status: 'pending' | 'syncing' | 'failed' | 'completed') {
    const db = await this.init();
    const note = await db.get('noteQueue', id);
    if (note) {
      note.status = status;
      await db.put('noteQueue', note);
    }
  }

  async clearCompleted() {
    const db = await this.init();
    const allPhotos = await db.getAll('photoQueue');
    const allNotes = await db.getAll('noteQueue');
    
    const completedPhotos = allPhotos.filter(photo => photo.status === 'completed');
    const completedNotes = allNotes.filter(note => note.status === 'completed');
    
    await Promise.all([
      ...completedPhotos.map(photo => db.delete('photoQueue', photo.id)),
      ...completedNotes.map(note => db.delete('noteQueue', note.id))
    ]);
  }

  async getQueueCounts() {
    const [pendingPhotos, pendingNotes, pendingTimeClock] = await Promise.all([
      this.getPendingPhotos(),
      this.getPendingNotes(),
      this.getPendingTimeClockActions()
    ]);
    
    return {
      photos: pendingPhotos.length,
      notes: pendingNotes.length,
      timeClock: pendingTimeClock.length,
      total: pendingPhotos.length + pendingNotes.length + pendingTimeClock.length
    };
  }

  // Time Clock Queue Methods
  async addTimeClockAction(
    entryId: string, 
    userId: string, 
    action: 'clock_out' | 'start_break' | 'end_break',
    clockOutTime?: string,
    totalHours?: number
  ) {
    const db = await this.init();
    const id = crypto.randomUUID();
    
    const queueItem = {
      id,
      entryId,
      userId,
      action,
      clockOutTime,
      totalHours,
      retryCount: 0,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };

    await db.put('timeClockQueue', queueItem);
    console.log('[OfflineQueue] Added time clock action to queue:', { id, action, entryId });
    return id;
  }

  async getPendingTimeClockActions() {
    const db = await this.init();
    const allActions = await db.getAll('timeClockQueue');
    return allActions.filter(action => action.status === 'pending' || action.status === 'failed');
  }

  async updateTimeClockActionStatus(
    id: string, 
    status: 'pending' | 'syncing' | 'failed' | 'completed'
  ) {
    const db = await this.init();
    const action = await db.get('timeClockQueue', id);
    if (action) {
      action.status = status;
      if (status === 'failed') {
        action.retryCount = (action.retryCount || 0) + 1;
      }
      await db.put('timeClockQueue', action);
      console.log('[OfflineQueue] Updated time clock action status:', { id, status });
    }
  }

  async deleteTimeClockAction(id: string) {
    const db = await this.init();
    await db.delete('timeClockQueue', id);
    console.log('[OfflineQueue] Deleted time clock action:', id);
  }

  async clearTimeClockQueue() {
    const db = await this.init();
    const allActions = await db.getAll('timeClockQueue');
    await Promise.all(allActions.map(action => db.delete('timeClockQueue', action.id)));
    console.log('[OfflineQueue] Cleared all time clock queue items');
  }
}

export const offlineQueue = new OfflineQueueManager();