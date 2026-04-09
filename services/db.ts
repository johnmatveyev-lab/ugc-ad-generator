// A simple IndexedDB wrapper to store large files like videos,
// which are too big for localStorage.

const DB_NAME = 'SoraPrompterDB';
const STORE_NAME = 'videoFiles';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            dbPromise = null; // Clear promise on error to allow retries
            reject(new Error('Failed to open IndexedDB.'));
        };

        request.onsuccess = () => {
            const db = request.result;
            // This handler is critical for robustness. If the browser closes the
            // connection (e.g., due to inactivity or resource pressure),
            // this will clear our cached promise, forcing a new connection
            // on the next database operation.
            db.onclose = () => {
                console.warn('IndexedDB connection was closed.');
                dbPromise = null;
            };
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
    return dbPromise;
}

export async function saveVideo(id: string, videoFile: File): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(videoFile, id);

        request.onerror = () => {
            console.error('Failed to save video:', request.error);
            reject(request.error);
        };
        request.onsuccess = () => {
            resolve();
        };
    });
}

export async function getVideo(id: string): Promise<File | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onerror = () => {
            console.error('Failed to get video:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve(request.result || null);
        };
    });
}

export async function deleteVideo(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        
        request.onerror = () => {
            console.error('Failed to delete video:', request.error);
            reject(request.error);
        };
        request.onsuccess = () => {
            resolve();
        };
    });
}